import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MarkdownRenderer, {
  SafeAnchor,
} from "@/components/common/MarkdownRenderer";

describe("MarkdownRenderer", () => {
  it("renders basic markdown content", () => {
    render(<MarkdownRenderer content="**Hello** _world_" />);

    expect(
      screen.getByText("Hello", { selector: "strong" }),
    ).toBeInTheDocument();
    expect(screen.getByText("world", { selector: "em" })).toBeInTheDocument();
  });

  it("renders fenced code blocks", () => {
    const codeSample = "```ts\nconst answer = 42;\n```";
    const { container } = render(<MarkdownRenderer content={codeSample} />);

    const codeElement = container.querySelector("pre code");
    expect(codeElement).not.toBeNull();
    expect(codeElement?.textContent).toContain("const answer = 42;");
  });

  it("sanitizes disallowed html", () => {
    const { container } = render(
      <MarkdownRenderer content={'Click<script>alert("xss")</script>'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(
      screen.getByText((text) => text.startsWith("Click")),
    ).toBeInTheDocument();
  });

  it("forces rel=noopener noreferrer on target=_blank links", () => {
    render(
      <SafeAnchor href="https://example.com" target="_blank">
        external
      </SafeAnchor>,
    );

    const link = screen.getByRole("link", { name: "external" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps explicit rel on same-tab links", () => {
    render(
      <SafeAnchor href="https://example.com" rel="nofollow">
        same-tab
      </SafeAnchor>,
    );

    const link = screen.getByRole("link", { name: "same-tab" });
    expect(link).not.toHaveAttribute("target");
    expect(link).toHaveAttribute("rel", "nofollow");
  });
});
