// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { CheckboxInput } from "../checkbox-input";

describe("CheckboxInput", () => {
  it("renders checked when value is true", () => {
    const { getByRole } = render(
      <CheckboxInput value={true} onValueChange={() => {}} />,
    );
    expect((getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("renders unchecked when value is false", () => {
    const { getByRole } = render(
      <CheckboxInput value={false} onValueChange={() => {}} />,
    );
    expect((getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });

  it("calls onValueChange with 'true' when checked", () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(
      <CheckboxInput value={false} onValueChange={onValueChange} />,
    );
    fireEvent.click(getByRole("checkbox"));
    expect(onValueChange).toHaveBeenCalledWith("true");
  });

  it("calls onValueChange with 'false' when unchecked", () => {
    const onValueChange = vi.fn();
    const { getByRole } = render(
      <CheckboxInput value={true} onValueChange={onValueChange} />,
    );
    fireEvent.click(getByRole("checkbox"));
    expect(onValueChange).toHaveBeenCalledWith("false");
  });

  it("forwards inputRef to the input element", () => {
    const ref = { current: null };
    const { getByRole } = render(
      <CheckboxInput value={false} onValueChange={() => {}} inputRef={ref} />,
    );
    expect(ref.current).toBe(getByRole("checkbox"));
  });
});
