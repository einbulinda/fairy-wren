const repo = require("./journals.repository");
const { CreateJournalDTO } = require("./journals.dto");
const auditRepo = require("../audit/audit.repository");

exports.list = async (filters) => {
  const { data, error } = await repo.findAll(filters);
  if (error) throw new Error("FAILED_TO_FETCH_JOURNALS");
  return data;
};

exports.getById = async (id) => {
  const { data, error } = await repo.findById(id);
  console.log("Fetched journal entry:", { id, data, error });
  if (error || !data) throw new Error("JOURNAL_NOT_FOUND");
  return data;
};

exports.create = async (payload, context) => {
  const dto = CreateJournalDTO(payload);
  const { lines, ...entryPayload } = dto;

  // Insert header
  const { data: entry, error: entryError } =
    await repo.createEntry(entryPayload);
  if (entryError) throw new Error("FAILED_TO_CREATE_JOURNAL");

  // Insert lines
  const linePayloads = lines.map((l) => ({ ...l, journal_entry_id: entry.id }));
  const { error: linesError } = await repo.createLines(linePayloads);
  if (linesError) throw new Error("FAILED_TO_CREATE_JOURNAL_LINES");

  await auditRepo.log({
    entity: "journal_entries",
    entity_id: entry.id,
    action: "JOURNAL_CREATED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: {
      reference: entry.reference,
      description: entry.description,
      lines: lines.length,
    },
  });

  return exports.getById(entry.id);
};

exports.void = async (id, context) => {
  const original = await exports.getById(id);

  if (original.reversed_entry_id) throw new Error("JOURNAL_ALREADY_VOIDED");
  if (original.source_type !== "manual")
    throw new Error("CANNOT_VOID_SYSTEM_JOURNAL");

  // Create reversing entry
  const reversalPayload = {
    entry_date: new Date().toISOString().split("T")[0],
    reference: `VOID-${original.reference || original.id.slice(0, 8)}`,
    description: `Reversal of: ${original.description || original.id}`,
    source_type: "manual",
  };

  const { data: reversal, error: reversalError } =
    await repo.createEntry(reversalPayload);
  if (reversalError) throw new Error("FAILED_TO_CREATE_REVERSAL");

  // Reverse the lines (swap debits and credits)
  const reversalLines = original.journal_lines.map((l) => ({
    journal_entry_id: reversal.id,
    account_id: l.account_id,
    description: l.description,
    debit: l.credit,
    credit: l.debit,
  }));

  const { error: linesError } = await repo.createLines(reversalLines);
  if (linesError) throw new Error("FAILED_TO_CREATE_REVERSAL_LINES");

  // Link original to reversal
  await repo.updateReversedEntryId(id, reversal.id);

  await auditRepo.log({
    entity: "journal_entries",
    entity_id: id,
    action: "JOURNAL_VOIDED",
    performed_by: context.userId,
    correlation_id: context.correlationId,
    metadata: { reversal_id: reversal.id },
  });

  return exports.getById(reversal.id);
};
