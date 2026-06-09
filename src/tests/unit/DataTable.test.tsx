import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DataTable, type Column } from "@/components/admin/DataTable";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}

const columns: Column<Row>[] = [{ key: "name", header: "Name" }];
const data: Row[] = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

describe("DataTable", () => {
  it("renders a row per data item", () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows the empty message when there is no data", () => {
    render(
      <DataTable columns={columns} data={[]} emptyMessage="Nothing to see" />
    );
    expect(screen.getByText("Nothing to see")).toBeInTheDocument();
  });

  it("renders pagination and reports page changes", () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={{ page: 1, totalPages: 3 }}
        onPageChange={onPageChange}
      />
    );
    // Page links 1..3 are shown when totalPages > 1.
    const page2 = screen.getByText("2");
    expect(page2).toBeInTheDocument();
    fireEvent.click(page2);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("hides pagination for a single page", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        pagination={{ page: 1, totalPages: 1 }}
      />
    );
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("renders a selection checkbox column when selectable", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        selectable
        selectedIds={[]}
        onSelectionChange={() => {}}
      />
    );
    // Header select-all + one per row = 3 checkboxes.
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });
});
