import { describe, it, expect } from "vitest";
import { validateApplication } from "@/lib/validateApplication";
import { reviews, GENERIC_MOTIVATION_QUESTION } from "@/constants";

const SESSION_EMAIL = "student@example.com";
const DEPARTMENT = reviews[0].name;

const validPayload = (overrides = {}) => ({
  Name: "Jane Doe",
  RegistrationNumber: "25BCE5612",
  Gender: "Female",
  Email: SESSION_EMAIL,
  Phone: "9876543210",
  "Year of Study": "2nd Year",
  [GENERIC_MOTIVATION_QUESTION]: "I want to build things with other people.",
  Pref: "1",
  Department: DEPARTMENT,
  Questions: { "A question?": "An answer." },
  ...overrides,
});

const validate = (payload) =>
  validateApplication(payload, { email: SESSION_EMAIL });

describe("validateApplication", () => {
  it("accepts a well-formed application", () => {
    const result = validate(validPayload());
    expect(result.error).toBeNull();
    expect(result.fields.Name).toBe("Jane Doe");
    expect(result.fields.Department).toBe(DEPARTMENT);
  });

  it("rejects a department that is not in the catalogue", () => {
    const result = validate(validPayload({ Department: "Department of Nope" }));
    expect(result.error).toMatch(/does not exist/i);
  });

  it.each([
    ["a missing name", { Name: "" }],
    ["an over-long name", { Name: "x".repeat(200) }],
    ["a missing registration number", { RegistrationNumber: undefined }],
    ["a malformed registration number", { RegistrationNumber: "25bce5612" }],
    ["a short phone number", { Phone: "12345" }],
    ["an unknown gender", { Gender: "Robot" }],
    ["an unknown year of study", { "Year of Study": "7th Year" }],
    ["a missing motivation answer", { [GENERIC_MOTIVATION_QUESTION]: "" }],
    ["an out-of-range preference", { Pref: "99" }],
    ["answers that are not an object", { Questions: ["nope"] }],
    ["a non-string answer", { Questions: { q: { nested: true } } }],
  ])("rejects %s", (_label, overrides) => {
    expect(validate(validPayload(overrides)).error).toBeTruthy();
  });

  it("rejects an answer longer than the stored limit", () => {
    const result = validate(
      validPayload({ Questions: { q: "x".repeat(6000) } })
    );
    expect(result.error).toMatch(/under \d+ characters/i);
  });

  it("drops unknown fields instead of storing them", () => {
    const result = validate(
      validPayload({ adminNote: "hi", evil: [1, 2, 3], nested: { a: 1 } })
    );
    expect(result.error).toBeNull();
    expect(result.fields).not.toHaveProperty("adminNote");
    expect(result.fields).not.toHaveProperty("evil");
    expect(result.fields).not.toHaveProperty("nested");
  });

  it("never lets the request set its own shortlisted flag", () => {
    const result = validate(validPayload({ shortlisted: true }));
    expect(result.fields.shortlisted).toBe(false);
  });

  it("takes the email from the session, not the request body", () => {
    const result = validate(validPayload({ Email: "someone.else@example.com" }));
    expect(result.fields.Email).toBe(SESSION_EMAIL);
  });

  it("trims whitespace around stored values", () => {
    const result = validate(
      validPayload({ Name: "  Jane Doe  ", Questions: { q: "  answer  " } })
    );
    expect(result.fields.Name).toBe("Jane Doe");
    expect(result.fields.Questions.q).toBe("answer");
  });

  it("rejects a payload that is not an object", () => {
    expect(validate(null).error).toBeTruthy();
    expect(validate([]).error).toBeTruthy();
  });
});
