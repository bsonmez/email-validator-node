const { isEmailValid, isMXRecordValid } = require("../index");

const validDomains = [
  "google",
  "outlook",
  "wwc.org",
  "gmail",
  "yandex",
  "youtube",
].map((eachDomain) => `test@${eachDomain}.com`);

const invalidDomains = [
  "test@g00gle.com",
  "test@0utl0k.com",
  "test@ASDQWE22.com",
  "test@this-is-fake-domain.com",
  "",
  "test@0-00.usa.cc",
  "this_is_very_long_username_therefore_it_should_be_invalid_address@example.org",
  "this-is_also_invalid@test@example.org",
  "a@s.a",
  "test@10minutemail.com",
  123,
  "!test!@asd.asd.ad",
];

describe("Email tests for validation", () => {
  it("Should be valid ", async () => {
    for (let each of validDomains) {
      const result = await isEmailValid(each);
      expect(result.isValid).toBeTruthy();
    }
  });

  it("Should be invalid ", async () => {
    for (let each of invalidDomains) {
      const result = await isEmailValid(each);
      expect(result.isValid).toBeFalsy();
    }
  });
});
