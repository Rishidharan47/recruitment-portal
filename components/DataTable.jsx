"use client";
import { React, useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterDepartment from "./FilterDepartment";
import FilterShortlisted from "./FilterShortlisted";
import { FaSortAmountDownAlt } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";
import { Button } from "./ui/button";
import { CheckBoxComp } from "./CheckBoxComp";
import { toast } from "sonner";
import { curDate, curDay, curMonth, curYear, months, days } from "@/constants";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { Search } from "lucide-react";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  useFilters,
  usePagination,
  useRowSelect,
} from "react-table";
import { Input } from "@/components/ui/input";
import PaginationComp from "./PaginationComp";
import DialogComp from "./DialogComp";
import MailComposer from "./MailComposer";
import { CSVLink } from "react-csv";
import { CSV_Header } from "@/constants";

const DataTable = ({ data }) => {
  // One source of truth for the records, with the two filters derived from it.
  // Previously both filters sliced the original `data` prop while shortlisting
  // wrote to a separate `tableData` state, so a row toggled while a filter was
  // active reverted to its stale status as soon as the filter changed.
  const [records, setRecords] = useState(data);
  const [deptFilter, setDeptFilter] = useState("");
  const [shortlistFilter, setShortlistFilter] = useState("");

  const tableData = useMemo(
    () =>
      records.filter(
        (record) =>
          (!deptFilter || record.Department === deptFilter) &&
          (!shortlistFilter ||
            String(Boolean(record.shortlisted)) === shortlistFilter)
      ),
    [records, deptFilter, shortlistFilter]
  );

  const resetFilters = () => {
    setDeptFilter("");
    setShortlistFilter("");
  };

  const applicantTotalCount = tableData.length;
  const shortlistedApplicantCount = useMemo(
    () => tableData.filter((item) => item.shortlisted).length,
    [tableData]
  );

  const handleShortlist = async (id, isShortlisted) => {
    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !isShortlisted }),
      });

      if (!res.ok) throw new Error("Failed to update");

      setRecords((prev) =>
        prev.map((applicant) =>
          applicant._id === id
            ? { ...applicant, shortlisted: !isShortlisted }
            : applicant
        )
      );
      toast.success("Student status updated!");
    } catch (error) {
      console.error("Error occurred while updating the status:", error.message);
      toast.error("Failed to update status");
    }
  };

  const columns = useMemo(
    () => [
      {
        Header: "Sr No",
        accessor: (row, index) => index + 1,
      },
      {
        Header: "Name",
        accessor: "Name",
      },
      {
        Header: "Registration Number",
        accessor: "RegistrationNumber",
      },
      {
        Header: "Email",
        accessor: "Email",
      },
      {
        Header: "Phone",
        accessor: "Phone",
      },
      {
        Header: "Department",
        accessor: "Department",
      },
      {
        Header: "Preference",
        accessor: "Pref",
      },
      {
        Header: "Shortlisted",
        accessor: "shortlisted",
        Cell: ({ row }) => {
          const isShortlisted = Boolean(row.original.shortlisted);
          return (
            <button
              type="button"
              onClick={() => handleShortlist(row.original._id, isShortlisted)}
              title={isShortlisted ? "Click to un-shortlist" : "Click to shortlist"}
              className={`w-[130px] rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isShortlisted
                  ? "border-success/40 bg-success/15 text-success hover:bg-success/25"
                  : "border-white/15 text-zinc-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {isShortlisted ? "Shortlisted" : "Not shortlisted"}
            </button>
          );
        },
      },
    ],
    [tableData]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    state,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data: tableData,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => {
        return [
          {
            Header: ({ getToggleAllRowsSelectedProps }) => (
              <CheckBoxComp
                label="Select all applicants on this page"
                {...getToggleAllRowsSelectedProps()}
              />
            ),
            Cell: ({ row }) => (
              <CheckBoxComp
                label={`Select ${row.original?.Name || "applicant"}`}
                {...row.getToggleRowSelectedProps()}
              />
            ),
          },
          ...columns,
        ];
      });
    }
  );

  const { globalFilter, pageIndex } = state;

  const handlePageSize = (e) => {
    const sz = Number(e.target.value);
    if (sz) {
      setPageSize(sz);
    } else {
      setPageSize(10);
    }
  };

  const handleRowSelection = async (payloadData) => {
    const selectedApplicants = selectedFlatRows.map((row) => row.original);
    const request = {
      recipients: selectedApplicants,
      payloadData: payloadData,
    };

    try {
      // const response = await MailSender(request);
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        toast("Invite has been sent!", {
          description: `On ${months[curMonth - 1]} ${curDate}, ${curYear}`,
        });
      } else {
        toast("Failed to send invite", {
          description: "Please try again later.",
        });
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast("Failed to send invite", {
        description: "Please try again later.",
      });
    }
  };

  const showRowData = () => {
    const selectedApplicants = selectedFlatRows.map((row) => row.original);
    return selectedApplicants;
  };

  const formatQuestionsForCsv = (item) => {
    if (!item?.Questions) return "";

    if (Array.isArray(item.Questions)) {
      return item.Questions
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (Array.isArray(entry)) return entry.join(": ");
          if (entry && typeof entry === "object") {
            return Object.entries(entry)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ");
          }
          return String(entry ?? "");
        })
        .join(" | ");
    }

    if (typeof item.Questions === "object") {
      return Object.entries(item.Questions)
        .map(([question, answer]) => `${question}: ${answer}`)
        .join(" | ");
    }

    return String(item.Questions);
  };

  const csv_link = {
    headers: CSV_Header,
    data: tableData.map((item) => ({
      ...item,
      Questions: formatQuestionsForCsv(item),
    })),
  };

  const pageSize = state.pageSize;
  const firstRowOnPage = applicantTotalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRowOnPage = Math.min((pageIndex + 1) * pageSize, applicantTotalCount);

  // Only counts that exist in the data. The reference design also showed
  // "Under review" and "Rejected", but an application has a `shortlisted`
  // boolean and nothing else - inventing statuses in the UI would mean
  // filtering by something that is never stored.
  const stats = [
    { label: "Total applicants", value: records.length, className: "text-white" },
    { label: "Shortlisted", value: shortlistedApplicantCount, className: "text-success" },
    {
      label: "Not shortlisted",
      value: records.length - records.filter((r) => r.shortlisted).length,
      className: "text-zinc-300",
    },
    {
      label: "Departments",
      value: new Set(records.map((r) => r.Department).filter(Boolean)).size,
      className: "text-brand",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">
            Recruitment {new Date().getFullYear()}
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
            Applicants
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            View, filter and manage all recruitment applications.
          </p>
        </div>

        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs text-zinc-500">{stat.label}</dt>
              <dd className={`mt-1 text-2xl font-semibold tabular-nums ${stat.className}`}>
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <Input
            value={globalFilter || ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search by name, reg no or email..."
            aria-label="Search applicants"
            className="pl-9"
          />
        </div>

        <FilterDepartment filterFunc={setDeptFilter} value={deptFilter} />
        <FilterShortlisted filterFunc={setShortlistFilter} value={shortlistFilter} />
        <DialogComp selectedApplicants={showRowData} />

        <Button variant="outline" asChild>
          <CSVLink {...csv_link} className="flex items-center gap-2">
            <IoCloudDownloadOutline />
            Export
          </CSVLink>
        </Button>
        <Button variant="outline" onClick={resetFilters} className="flex gap-2">
          <GrPowerReset />
          Reset
        </Button>

        <Input
          className="w-[110px]"
          onChange={(e) => handlePageSize(e)}
          placeholder="Page size"
          aria-label="Rows per page"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <Table {...getTableProps()}>
          <caption className="sr-only">
            Recruitment applicants. {applicantTotalCount} shown,{" "}
            {shortlistedApplicantCount} shortlisted. Use the Shortlisted column
            button to change an applicant&apos;s status.
          </caption>
          <TableHeader>
            {headerGroups.map((hg) => {
              // react-table returns `key` inside its props objects; spreading
              // it into JSX is a React warning, so pull it out explicitly.
              const { key: hgKey, ...hgProps } = hg.getHeaderGroupProps();
              return (
                <TableRow key={hgKey} {...hgProps}>
                  {hg.headers.map((header) => {
                    const { key: headerKey, ...headerProps } =
                      header.getHeaderProps(header.getSortByToggleProps());
                    return (
                      <TableHead
                        key={headerKey}
                        {...headerProps}
                        scope="col"
                        className="whitespace-nowrap text-xs uppercase tracking-wider text-zinc-400"
                      >
                        <div className="inline-flex items-center gap-1.5">
                          {header.render("Header")}
                          {header.canSort !== false && (
                            <FaSortAmountDownAlt
                              className="h-3 w-3 text-zinc-600"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHeader>
          <TableBody {...getTableBodyProps()}>
            {page.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="py-14 text-center text-sm text-zinc-500"
                >
                  No applicants match these filters.
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ml-1 text-brand underline underline-offset-4"
                  >
                    Reset them
                  </button>
                  .
                </TableCell>
              </TableRow>
            )}
            {page.map((row) => {
              prepareRow(row);
              const { key: rowKey, ...rowProps } = row.getRowProps();
              return (
                <TableRow
                  key={rowKey}
                  {...rowProps}
                  className="border-white/5 transition-colors hover:bg-white/[0.03]"
                >
                  {row.cells.map((cell) => {
                    const { key: cellKey, ...cellProps } = cell.getCellProps();
                    return (
                      <TableCell
                        key={cellKey}
                        {...cellProps}
                        className="whitespace-nowrap text-sm text-zinc-300"
                      >
                        {cell.render("Cell")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <PaginationComp
        pageIndex={pageIndex}
        nextPage={nextPage}
        canNext={canNextPage}
        previousPage={previousPage}
        canPrev={canPreviousPage}
        goto={gotoPage}
        pageCount={pageCount}
        summary={
          applicantTotalCount === 0
            ? "No applicants to show"
            : `Showing ${firstRowOnPage} – ${lastRowOnPage} of ${applicantTotalCount} applicants`
        }
      />
    </div>
  );
};

export default DataTable;
