import React, { useEffect, useMemo, useRef, useState } from "react";
import * as z from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "./ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { QuestionnaireData, GENERIC_MOTIVATION_QUESTION } from "@/constants";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";

const normaliseQuestion = (question) =>
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question;

const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const selectClasses =
  "flex h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-50";

const FormComp = ({ dept1, dept2 }) => {
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isSignedIn = !!user;
  const isLoaded = !isPending;

  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedDepartments, setSubmittedDepartments] = useState([]);
  const [isDraftReady, setIsDraftReady] = useState(false);

  const router = useRouter();
  const { submittedDepartments: contextSubmitted, markDepartmentsSubmitted } =
    useSubmissions();

  const departmentNames = useMemo(
    () =>
      [dept1, dept2]
        .filter(Boolean)
        .map((department) =>
          typeof department === "string" ? department : department.name
        ),
    [dept1, dept2]
  );

  const draftKey =
    user?.email && departmentNames.length
      ? `recruitment-draft:${user.email}:${[...departmentNames].sort().join("|")}`
      : null;

  const normalizeDeptName = (str) =>
    str ? str.trim().toLowerCase().replace(/\s*\/\s*/g, "/") : "";

  const questionsForDepartment = useMemo(
    () => (department) =>
      (
        QuestionnaireData.find(
          (item) => normalizeDeptName(item.department) === normalizeDeptName(department)
        )?.questions ?? []
      ).map(normaliseQuestion),
    []
  );

  const questionData = useMemo(
    () => [
      ...new Set(
        departmentNames.flatMap((department) =>
          questionsForDepartment(department).map((question) => question.name)
        )
      ),
    ],
    [departmentNames, questionsForDepartment]
  );

  const formSchema = useMemo(() => {
    const schemaObj = {
      Name: z.string().min(1, "Name is required"),
      RegistrationNumber: z
        .string()
        .min(1, "Registration number is required")
        .regex(
          /^\d{2}[A-Z]{3}\d{4}$/,
          "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)"
        ),
      Gender: z.string().min(1, "Please select an option"),
      Email: z.string(),
      Phone: z
        .string()
        .min(1, "Phone is required")
        .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
      "Year of Study": z.string().min(1, "Year of study is required"),
      [GENERIC_MOTIVATION_QUESTION]: z
        .string()
        .min(1, "Please tell us why you want to join"),
    };

    questionData.forEach((qd) => {
      schemaObj[qd] = z.string().optional();
    });

    return z.object(schemaObj);
  }, [questionData]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    // Every question needs a defined default, otherwise its field starts as
    // undefined and React logs "changing an uncontrolled input to be
    // controlled" the moment the applicant types.
    defaultValues: {
      Name: "",
      RegistrationNumber: "",
      Gender: "",
      Email: "",
      Phone: "",
      "Year of Study": "",
      [GENERIC_MOTIVATION_QUESTION]: "",
      ...Object.fromEntries(questionData.map((question) => [question, ""])),
    },
  });

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || !draftKey || hydratedRef.current) return;
    hydratedRef.current = true;

    const email = user.email;

    let savedDraft = {};
    try {
      savedDraft = JSON.parse(localStorage.getItem(draftKey) || "{}");
    } catch {
      savedDraft = {};
    }
    form.reset({ ...form.getValues(), ...savedDraft.values, Email: email });

    async function initialiseForm() {
      let remoteSubmitted = contextSubmitted || [];
      let applicationCount = remoteSubmitted.length;

      if (!remoteSubmitted.length) {
        const cacheKey = `submitted_depts_${email}`;
        const cached =
          typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;

        if (cached) {
          try {
            remoteSubmitted = JSON.parse(cached);
            applicationCount = remoteSubmitted.length;
          } catch {}
        } else {
          try {
            const response = await fetch(
              `/api/check-applications?email=${encodeURIComponent(email)}`
            );
            const result = await response.json();
            if (result?.submittedDepartments) {
              remoteSubmitted = result.submittedDepartments;
              applicationCount = result.count ?? remoteSubmitted.length;
              if (typeof window !== "undefined") {
                sessionStorage.setItem(cacheKey, JSON.stringify(remoteSubmitted));
              }
            }
          } catch (err) {
            console.error("Failed to check applications:", err);
          }
        }
      }

      const completed = [
        ...new Set([...(savedDraft.submittedDepartments || []), ...remoteSubmitted]),
      ];
      setSubmittedDepartments(completed);

      if (applicationCount >= 2) {
        setErrorMessage(
          "Remember that you can only submit upto 2 unique applications"
        );
      } else if (
        departmentNames.length > 0 &&
        departmentNames.every((dept) => completed.includes(dept))
      ) {
        setErrorMessage(
          `You have already submitted an application for ${departmentNames.join(" and ")}.`
        );
      }

      localStorage.setItem(
        draftKey,
        JSON.stringify({ values: form.getValues(), submittedDepartments: completed })
      );
      setIsDraftReady(true);
    }

    initialiseForm().catch(() => setIsDraftReady(true));
  }, [contextSubmitted, departmentNames, draftKey, form, isLoaded, user]);

  const watchedValues = useWatch({ control: form.control });

  useEffect(() => {
    if (!isDraftReady || !draftKey) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({ values: watchedValues, submittedDepartments })
    );
  }, [draftKey, isDraftReady, submittedDepartments, watchedValues]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="mx-auto mb-4 block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="m-10 flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-2xl font-semibold text-white">Sign In Required</p>
          <p className="mb-6 text-lg text-gray-300">
            Please sign in to access the application form.
          </p>
          <Button
            onClick={() => router.push("/auth/signin")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const pendingDepartments = departmentNames.filter(
      (department) => !submittedDepartments.includes(department)
    );

    if (!pendingDepartments.length) {
      toast.success("Your applications have already been submitted.");
      setIsSubmitting(false);
      router.push("/departments");
      return;
    }

    // Every field rendered above has to appear here, otherwise the answer is
    // collected from the applicant and then silently dropped before it ever
    // reaches the API. Gender and the motivation answer used to be missing.
    const basicDetails = {
      Name: values.Name,
      RegistrationNumber: values.RegistrationNumber,
      Gender: values.Gender,
      Email: values.Email,
      Phone: values.Phone,
      "Year of Study": values["Year of Study"],
      [GENERIC_MOTIVATION_QUESTION]: values[GENERIC_MOTIVATION_QUESTION],
    };

    const submitDepartment = async (department, index) => {
      const questions = questionsForDepartment(department);

      const response = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basicDetails,
          Department: department,
          // Which choice this application was for the applicant (1st or 2nd);
          // the admin table and CSV export have always had a Preference column
          // but nothing ever populated it.
          Pref: String(departmentNames.indexOf(department) + 1),
          Questions: questions.reduce(
            (answers, question) => ({
              ...answers,
              [question.name]: values[question.name] || "",
            }),
            {}
          ),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Could not submit ${department}.`);
      }
      return { department, success: true };
    };

    try {
      const results = await Promise.allSettled(
        pendingDepartments.map(submitDepartment)
      );
      const successful = results
        .filter((result) => result.status === "fulfilled" && result.value.success)
        .map((result) => result.value.department);
      const failed = results.flatMap((result, index) =>
        result.status === "rejected" ? [pendingDepartments[index]] : []
      );
      const completed = [...new Set([...submittedDepartments, ...successful])];

      setSubmittedDepartments(completed);
      markDepartmentsSubmitted(completed);
      if (draftKey)
        localStorage.setItem(
          draftKey,
          JSON.stringify({ values, submittedDepartments: completed })
        );
      if (typeof window !== "undefined" && values?.Email) {
        sessionStorage.setItem(
          `submitted_depts_${values.Email}`,
          JSON.stringify(completed)
        );
      }
      successful.forEach((department) =>
        toast.success(`Application submitted for ${department}.`)
      );

      if (failed.length) {
        const reason = results.find((result) => result.status === "rejected")?.reason;
        setErrorMessage(
          reason?.message ||
            `Submitted ${successful.length ? successful.join(", ") : "no applications"}. Please retry ${failed.join(", ")}.`
        );
      } else {
        router.push("/departments");
      }
    } catch {
      setErrorMessage(
        "Your applications could not be submitted. Your saved answers will be kept for retrying."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      {errorMessage && !isSubmitting && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-300">{errorMessage}</p>
          <button
            type="button"
            className="mt-3 text-sm font-medium text-white underline underline-offset-4"
            onClick={() => router.push("/departments")}
          >
            Go back to departments
          </button>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Application Form
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Applying to{" "}
          <span className="font-medium text-white">
            {departmentNames.join(" and ")}
          </span>
          . Your answers are saved in this browser as you type.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-medium text-white">About you</h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="Name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Jane Doe" autoComplete="name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="RegistrationNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 25BCE5612" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value || ""}
                        className={selectClasses}
                      >
                        <option value="" disabled>
                          Select gender
                        </option>
                        {GENDER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Year of Study"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of study</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value || ""}
                        className={selectClasses}
                      >
                        <option value="" disabled>
                          Select year
                        </option>
                        {YEAR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly type="email" className="opacity-70" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (WhatsApp)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        inputMode="numeric"
                        placeholder="9876543210"
                        autoComplete="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-5">
              <FormField
                control={form.control}
                name={GENERIC_MOTIVATION_QUESTION}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{GENERIC_MOTIVATION_QUESTION}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="2-3 sentences" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </section>

          {departmentNames.map((department) => (
            <DepartmentQuestions
              key={department}
              department={department}
              questions={questionsForDepartment(department)}
              form={form}
            />
          ))}

          <div className="flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => router.push("/departments")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Submitting..." : "Submit application"}
            </Button>
          </div>
        </form>
      </Form>
    </main>
  );
};

const DepartmentQuestions = ({ department, questions, form }) => {
  // The shared motivation question is asked once in "About you"; skip it here
  // whichever wording a department's list still uses.
  const departmentQuestions = questions.filter(
    (question) => !question.name.startsWith("Why do you want to join")
  );

  if (!departmentQuestions.length) return null;

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <h2 className="mb-5 text-lg font-medium text-white">{department} questions</h2>

      <div className="space-y-5">
        {departmentQuestions.map((question) => (
          <FormField
            key={question.name}
            control={form.control}
            name={question.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{question.name}</FormLabel>
                <FormControl>
                  {question.type === "short-text" ? (
                    <Input {...field} placeholder={question.placeholder || "Answer..."} />
                  ) : (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={question.placeholder || "2-3 sentences"}
                    />
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>
    </section>
  );
};

export default FormComp;
