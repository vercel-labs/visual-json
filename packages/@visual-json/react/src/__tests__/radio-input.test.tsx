// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { RadioInput } from "../radio-input";

describe("RadioInput", () => {
  const options = ["low", "medium", "high"];

  it("renders all options", () => {
    const { getByLabelText } = render(
      <RadioInput options={options} value="low" onValueChange={() => {}} />,
    );
    expect(getByLabelText("low")).toBeTruthy();
    expect(getByLabelText("medium")).toBeTruthy();
    expect(getByLabelText("high")).toBeTruthy();
  });

  it("marks the current value as checked", () => {
    const { getByLabelText } = render(
      <RadioInput options={options} value="medium" onValueChange={() => {}} />,
    );
    expect((getByLabelText("medium") as HTMLInputElement).checked).toBe(true);
    expect((getByLabelText("low") as HTMLInputElement).checked).toBe(false);
    expect((getByLabelText("high") as HTMLInputElement).checked).toBe(false);
  });

  it("calls onValueChange with the selected option", () => {
    const onValueChange = vi.fn();
    const { getByLabelText } = render(
      <RadioInput
        options={options}
        value="low"
        onValueChange={onValueChange}
      />,
    );
    fireEvent.click(getByLabelText("high"));
    expect(onValueChange).toHaveBeenCalledWith("high");
  });

  it("all radios share the same name (mutual exclusion)", () => {
    const { getByLabelText } = render(
      <RadioInput options={options} value="low" onValueChange={() => {}} />,
    );
    const names = options.map(
      (o) => (getByLabelText(o) as HTMLInputElement).name,
    );
    expect(new Set(names).size).toBe(1);
  });

  it("forwards inputRef to the first option", () => {
    const ref = { current: null };
    const { getByLabelText } = render(
      <RadioInput
        options={options}
        value="low"
        onValueChange={() => {}}
        inputRef={ref}
      />,
    );
    expect(ref.current).toBe(getByLabelText("low"));
  });
});
