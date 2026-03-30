import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Set the worker source to local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text from PDF file
 */
export const extractTextFromPdf = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join("\n");
    fullText += pageText + "\n";
  }
  
  return fullText;
};

/**
 * Parse KCB bank statement format
 */
export const parseKcbStatement = (text) => {
  const lines = [];
  const textLines = text.split("\n").map((l) => l.trim()).filter((l) => l);
  
  // Find the header row to identify column positions
  let headerIndex = -1;
  for (let i = 0; i < textLines.length; i++) {
    if (textLines[i].includes("TXN DATE") && textLines[i].includes("DESCRIPTION")) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    // Try alternative parsing if no header found
    return parseKcbStatementAlternative(textLines);
  }
  
  // Parse statement metadata
  let openingBalance = 0;
  let closingBalance = 0;
  let startDate = null;
  let endDate = null;
  
  for (let i = 0; i < headerIndex; i++) {
    const line = textLines[i];
    
    if (line.includes("Balance at Period Start:")) {
      const match = line.match(/Balance at Period Start:\s*([\d,]+\.?\d*)/);
      if (match) openingBalance = parseFloat(match[1].replace(/,/g, ""));
    }
    
    if (line.includes("Balance at Period End:")) {
      const match = line.match(/Balance at Period End:\s*([\d,]+\.?\d*)/);
      if (match) closingBalance = parseFloat(match[1].replace(/,/g, ""));
    }
    
    if (line.includes("Statement Period:")) {
      const match = line.match(/Statement Period:\s*(\d{2}\s+[A-Z]{3}\s+\d{4})\s*-\s*(\d{2}\s+[A-Z]{3}\s+\d{4})/);
      if (match) {
        startDate = parseKcbDate(match[1]);
        endDate = parseKcbDate(match[2]);
      }
    }
  }
  
  // Parse transactions
  let i = headerIndex + 1;
  while (i < textLines.length) {
    const line = textLines[i];
    
    // Check if this is a transaction line (starts with date like "01 NOV 2025")
    const dateMatch = line.match(/^(\d{2}\s+[A-Z]{3}\s+\d{4})/);
    if (dateMatch) {
      const txnDate = dateMatch[1];
      let description = "";
      let valueDate = "";
      let moneyOut = 0;
      let moneyIn = 0;
      let ledgerBalance = 0;
      
      // Collect description lines until we hit a value date pattern
      i++;
      while (i < textLines.length) {
        const nextLine = textLines[i];
        
        // Check if this line starts a new transaction
        if (nextLine.match(/^\d{2}\s+[A-Z]{3}\s+\d{4}/)) {
          i--; // Back up, this is the next transaction
          break;
        }
        
        // Check if this looks like a value date (date pattern in the middle of transaction)
        const valueDateMatch = nextLine.match(/^(\d{2}\s+[A-Z]{3}\s+\d{4})\s+([\d,]+\.?\d*)?\s*([\d,]+\.?\d*)?\s*([\d,]+\.?\d*)?/);
        if (valueDateMatch) {
          valueDate = valueDateMatch[1];
          const col2 = valueDateMatch[2] ? parseFloat(valueDateMatch[2].replace(/,/g, "")) : null;
          const col3 = valueDateMatch[3] ? parseFloat(valueDateMatch[3].replace(/,/g, "")) : null;
          const col4 = valueDateMatch[4] ? parseFloat(valueDateMatch[4].replace(/,/g, "")) : null;
          
          // Determine which columns are money out, money in, and balance
          // KCB format: VALUE_DATE, MONEY_OUT, MONEY_IN, LEDGER_BALANCE
          if (col2 !== null) {
            // col2 could be money out or the start of money in
            if (col3 !== null) {
              moneyOut = col2 || 0;
              moneyIn = col3 || 0;
              ledgerBalance = col4 || 0;
            } else {
              // Only one amount column found - determine if it's money in or out
              if (description.toLowerCase().includes("transfer") && description.includes("MPES")) {
                moneyIn = col2 || 0;
              } else {
                moneyIn = col2 || 0; // Default to money in for simplicity
              }
            }
          }
          break;
        }
        
        // This is part of the description
        if (description) description += " ";
        description += nextLine;
        i++;
      }
      
      if (description && valueDate) {
        lines.push({
          transaction_date: parseKcbDate(valueDate),
          description: description.trim(),
          reference: extractReference(description),
          deposit: moneyIn,
          withdrawal: moneyOut,
        });
      }
    }
    
    i++;
  }
  
  return {
    openingBalance,
    closingBalance,
    startDate: startDate || (lines.length > 0 ? lines[0].transaction_date : null),
    endDate: endDate || (lines.length > 0 ? lines[lines.length - 1].transaction_date : null),
    lines,
  };
};

/**
 * Alternative parsing for KCB statements with different layout
 */
const parseKcbStatementAlternative = (textLines) => {
  const lines = [];
  let openingBalance = 0;
  let closingBalance = 0;
  
  // Look for balance information
  for (const line of textLines) {
    if (line.includes("Opening Balance")) {
      const match = line.match(/([\d,]+\.?\d*)/);
      if (match) openingBalance = parseFloat(match[1].replace(/,/g, ""));
    }
    if (line.includes("Closing Balance")) {
      const match = line.match(/([\d,]+\.?\d*)/);
      if (match) closingBalance = parseFloat(match[1].replace(/,/g, ""));
    }
  }
  
  // Try to find transaction patterns
  for (let i = 0; i < textLines.length; i++) {
    const line = textLines[i];
    
    // Look for date followed by description pattern
    const txnMatch = line.match(/(\d{2}\s+[A-Z]{3}\s+\d{4})\s+(.+)/);
    if (txnMatch) {
      const date = txnMatch[1];
      const rest = txnMatch[2];
      
      // Try to extract amounts from the rest of the line
      const amounts = rest.match(/([\d,]+\.?\d*)/g);
      if (amounts && amounts.length >= 2) {
        const nums = amounts.map((a) => parseFloat(a.replace(/,/g, "")));
        
        // Last number is usually the balance
        const balance = nums[nums.length - 1];
        
        // Determine money in/out based on balance change
        // This is heuristic and may need adjustment
        let moneyOut = 0;
        let moneyIn = 0;
        
        if (nums.length >= 3) {
          // Format: money_out, money_in, balance
          moneyOut = nums[nums.length - 3] || 0;
          moneyIn = nums[nums.length - 2] || 0;
        } else if (nums.length === 2) {
          // Only one transaction amount + balance
          const txnAmount = nums[0];
          // Need to compare with previous balance to determine direction
          moneyIn = txnAmount;
        }
        
        lines.push({
          transaction_date: parseKcbDate(date),
          description: rest.replace(/[\d,]+\.?\d*/g, "").trim(),
          reference: "",
          deposit: moneyIn,
          withdrawal: moneyOut,
        });
      }
    }
  }
  
  return {
    openingBalance,
    closingBalance,
    startDate: lines.length > 0 ? lines[0].transaction_date : null,
    endDate: lines.length > 0 ? lines[lines.length - 1].transaction_date : null,
    lines,
  };
};

/**
 * Parse KCB date format (e.g., "01 NOV 2025") to ISO date
 */
const parseKcbDate = (dateStr) => {
  const months = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };
  
  const match = dateStr.match(/(\d{2})\s+([A-Z]{3})\s+(\d{4})/);
  if (match) {
    const day = match[1];
    const month = months[match[2].toUpperCase()];
    const year = match[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return dateStr; // Return as-is if parsing fails
};

/**
 * Extract reference number from description
 */
const extractReference = (description) => {
  // Look for common reference patterns
  const patterns = [
    /\b\d{10,}\b/, // 10+ digit numbers
    /MPESA\s+([A-Z0-9]+)/i,
    /Ref[:\s]+([A-Z0-9]+)/i,
    /Reference[:\s]+([A-Z0-9]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) return match[1] || match[0];
  }
  
  return "";
};

/**
 * Auto-detect bank format and parse
 */
export const parseBankStatementPdf = async (file) => {
  const text = await extractTextFromPdf(file);
  
  // Detect bank format
  if (text.includes("KCB") || text.includes("KENYA COMMERCIAL BANK")) {
    return { bank: "KCB", ...parseKcbStatement(text) };
  }
  
  // Add more bank formats here as needed
  
  // Default: try generic parsing
  return { bank: "UNKNOWN", ...parseKcbStatement(text) };
};
