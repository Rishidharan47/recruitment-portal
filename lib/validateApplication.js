import {
  isValidDepartment,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  GENERIC_MOTIVATION_QUESTION,
  FIELD_LIMITS,
} from "@/constants";

const REG_NO_REGEX = /^\d{2}[A-Z]{3}\d{4}$/;
const PHONE_REGEX = /^\d{10}$/;

const isString = (value) => typeof value === "string";
const trimmed = (value) => (isString(value) ? value.trim() : "");

/**
 * Validates an application payload and returns the exact document to store.
 *
 * The rules here mirror the zod schema in components/FormComp.jsx, which runs
 * only in the browser and is therefore trivially bypassed by posting straight
 * to the endpoint. The server is the one that has to be believed.
 *
 * It returns the fields to persist rather than letting the caller spread the
 * request body: the route previously did `{...formFields}`, so any extra key
 * the client invented was written to Firestore verbatim.
 *
 * @returns {{ error: string } | { error: null, fields: object }}
 */
export const validateApplication = (data, { email }) => {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return { error: "Malformed request." };
  }

  const { Department, Questions } = data;

  if (!isValidDepartment(Department)) {
    return { error: "That department does not exist." };
  }

  if (Questions === null || typeof Questions !== "object" || Array.isArray(Questions)) {
    return { error: "Malformed application answers." };
  }

  const name = trimmed(data.Name);
  if (!name) return { error: "Name is required." };
  if (name.length > FIELD_LIMITS.name) {
    return { error: `Name must be under ${FIELD_LIMITS.name} characters.` };
  }

  // Previously this was `if (RegistrationNumber && !regex.test(...))`, so a
  // request that omitted the field entirely passed the check.
  const registrationNumber = trimmed(data.RegistrationNumber);
  if (!REG_NO_REGEX.test(registrationNumber)) {
    return {
      error:
        "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
    };
  }

  const phone = trimmed(data.Phone);
  if (!PHONE_REGEX.test(phone)) {
    return { error: "Phone number must be exactly 10 digits." };
  }

  const gender = trimmed(data.Gender);
  if (!GENDER_OPTIONS.includes(gender)) {
    return { error: "Please select a valid option for gender." };
  }

  const yearOfStudy = trimmed(data["Year of Study"]);
  if (!YEAR_OPTIONS.includes(yearOfStudy)) {
    return { error: "Please select a valid year of study." };
  }

  const motivation = trimmed(data[GENERIC_MOTIVATION_QUESTION]);
  if (!motivation) {
    return { error: "Please tell us why you want to join." };
  }
  if (motivation.length > FIELD_LIMITS.answer) {
    return { error: `Answers must be under ${FIELD_LIMITS.answer} characters.` };
  }

  const pref = trimmed(data.Pref);
  if (!["1", "2"].includes(pref)) {
    return { error: "Invalid department preference." };
  }

  const questionEntries = Object.entries(Questions);
  if (questionEntries.length > FIELD_LIMITS.questionCount) {
    return { error: "Too many answers submitted." };
  }

  const answers = {};
  for (const [question, answer] of questionEntries) {
    if (!isString(answer)) {
      return { error: "Malformed application answers." };
    }
    if (question.length > FIELD_LIMITS.questionKey) {
      return { error: "Malformed application answers." };
    }
    if (answer.length > FIELD_LIMITS.answer) {
      return { error: `Answers must be under ${FIELD_LIMITS.answer} characters.` };
    }
    answers[question] = answer.trim();
  }

  return {
    error: null,
    fields: {
      Name: name,
      RegistrationNumber: registrationNumber,
      Gender: gender,
      Phone: phone,
      "Year of Study": yearOfStudy,
      [GENERIC_MOTIVATION_QUESTION]: motivation,
      Pref: pref,
      Department,
      Questions: answers,
      // Always taken from the session, never from the request body, so an
      // applicant cannot file an application under someone else's address.
      Email: email,
      shortlisted: false,
    },
  };
};
