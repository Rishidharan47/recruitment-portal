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
import {
  QuestionnaireData,
  GENERIC_MOTIVATION_QUESTION,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  FIELD_LIMITS,
} from "@/constants";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useSubmissions } from "@/components/SubmissionsProvider";

const normaliseQuestion = (question) =>
  typeof question === "string"
    ? { name: question, type: "generic", placeholder: "2-3 sentences" }
    : question;

// Reference C shows a numbered step rail beside the form. This form is a
// single page, so the rail is a section navigator that reflects where you
// actually are, rather than steps that don't exist.
const sectionId = (name) =>
  `section-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const CharacterCount = ({ value = "" }) => (
  <p className="mt-1 text-right text-xs tabular-nums text-zinc-500">
    {value.length}/{FIELD_LIMITS.answer}
  </p>
);

// `color-scheme: dark` is the only thing that changes the native popup a
// <select> opens - it's OS/browser chrome, not something Tailwind classes on
// the element can reach. Without it the popup renders in the browser's
// default light theme (white background, near-invisible against the page)
// regardless of how the closed control itself is styled.
const selectClasses =
  "flex h-10 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]";

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

  const sections = useMemo(
    () => [
      { id: sectionId("about"), label: "About you", hint: "Tell us about yourself" },
      ...departmentNames
        .filter((department) => questionsForDepartment(department).length)
        .map((department) => ({
          id: sectionId(department),
          label: department,
          hint: "Answer a few questions",
        })),
    ],
    [departmentNames, questionsForDepartment]
  );

  const [activeSection, setActiveSection] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections, isDraftReady]);

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
    // A <div>, not a <main>: the page that renders this already provides the
    // main landmark, and nesting <main> inside <main> is invalid.
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-10 sm:px-6">
      {errorMessage && !isSubmitting && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4"
        >
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

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24" aria-label="Form sections">
            <p className="mb-4 text-[11px] uppercase tracking-widest text-zinc-500">
              Application
            </p>
            <ol className="space-y-1">
              {sections.map((section, index) => {
                const isActive = activeSection === section.id;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`flex items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                        isActive ? "bg-white/5" : "hover:bg-white/[0.03]"
                      }`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                          isActive
                            ? "bg-brand text-brand-foreground"
                            : "border border-white/20 text-zinc-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm ${
                            isActive ? "text-white" : "text-zinc-400"
                          }`}
                        >
                          {section.label}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {section.hint}
                        </span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <p className="text-xs leading-relaxed text-zinc-400">
                You can apply to at most two departments. Your answers are saved
                in this browser as you type.
              </p>
            </div>
          </nav>
        </aside>

        <div>
          <header className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Application Form
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Share a bit about yourself and tell us why you&apos;d be a great fit.
            </p>
          </header>

          <Form {...form}>
            {/* The submit button lives in the sticky bar outside this element,
                so it is associated back to the form by id. */}
            <form
              id="application-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              <section
                id={sectionId("about")}
                className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
              >
                <h2 className="text-lg font-medium text-white">About you</h2>
                <p className="mb-5 mt-1 text-sm text-zinc-500">
                  Basic information to help us get to know you.
                </p>

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
                        <CharacterCount value={field.value} />
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
            </form>
          </Form>
        </div>
      </div>

      {/* Sticky action bar: on a form this long the submit button would
          otherwise sit a full screen or two below the last answer. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0d0d11]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <p className="hidden text-sm text-zinc-400 sm:block">
            Applying to{" "}
            <span className="font-medium text-white">
              {departmentNames.join(" and ")}
            </span>
            <span className="block text-xs text-zinc-500">
              Answers are saved in this browser as you type.
            </span>
          </p>

          <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => router.push("/departments")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="application-form"
              disabled={isSubmitting}
              className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90 sm:flex-none"
            >
              {isSubmitting ? "Submitting..." : "Submit application"}
            </Button>
          </div>
        </div>
      </div>
    </div>
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
    <section
      id={sectionId(department)}
      className="scroll-mt-24 rounded-xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Department questions</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Answer the following questions for this department.
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {department}
        </span>
      </div>

      <div className="space-y-6">
        {departmentQuestions.map((question, index) => (
          <FormField
            key={question.name}
            control={form.control}
            name={question.name}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex gap-2 leading-relaxed">
                  <span className="text-zinc-500">{index + 1}.</span>
                  <span>{question.name}</span>
                </FormLabel>
                <FormControl>
                  {question.type === "short-text" ? (
                    <Input {...field} placeholder={question.placeholder || "Answer..."} />
                  ) : (
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder={question.placeholder || "Write your answer here..."}
                    />
                  )}
                </FormControl>
                {question.type !== "short-text" && (
                  <CharacterCount value={field.value} />
                )}
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
