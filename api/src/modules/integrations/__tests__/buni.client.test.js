const { _internal, BuniError } = require("../buni.client");

describe("KCB addresses come from KCB_BUNI_BASE_URL only", () => {
  const saved = process.env.KCB_BUNI_BASE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.KCB_BUNI_BASE_URL;
    else process.env.KCB_BUNI_BASE_URL = saved;
  });

  it("builds the token and STK addresses from the base", () => {
    process.env.KCB_BUNI_BASE_URL = " https://uat.buni.kcbgroup.com/ ";
    expect(_internal.tokenUrl()).toBe("https://uat.buni.kcbgroup.com/token?grant_type=client_credentials");
    expect(_internal.stkUrl()).toBe("https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush");
  });

  it("fails clearly when the base is not set", () => {
    delete process.env.KCB_BUNI_BASE_URL;
    expect(() => _internal.tokenUrl()).toThrow(BuniError);
    expect(() => _internal.stkUrl()).toThrow("KCB_BUNI_BASE_URL is not set");
  });
});
