import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router";
import { expect, it, vi } from "vitest";
import { Field } from "../../components/molecules";
import { ManagedForm, SubmitButton } from "./managed-form";

function setup() {
  const action = vi.fn(() => ({ saved: true }));
  const router = createMemoryRouter([{ path: "/", action, element: <><ManagedForm protect method="post"><Field label="企業名"><input name="name" required /></Field><SubmitButton>保存</SubmitButton></ManagedForm><Link to="/next">移動する</Link></> }, { path: "/next", element: <h1>移動先</h1> }]);
  render(<RouterProvider router={router} />);
  return { router, action };
}
it("未入力の項目を示してフォーカスし、送信しない", async () => {
  const { action } = setup();
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "企業名" })).toHaveFocus());
  expect(screen.getByRole("alert")).toHaveTextContent("入力してください。");
  expect(action).not.toHaveBeenCalled();
});
it("未保存の変更を保護し、保存後は確認なしで移動する", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const { router } = setup();
  fireEvent.change(screen.getByRole("textbox", { name: "企業名" }), { target: { value: "テスト企業" } });
  fireEvent.click(screen.getByRole("link", { name: "移動する" }));
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
  expect(router.state.location.pathname).toBe("/");
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  await waitFor(() => expect(Object.values(router.state.actionData ?? {})).toContainEqual({ saved: true }));
  fireEvent.click(screen.getByRole("link", { name: "移動する" }));
  await screen.findByRole("heading", { name: "移動先" });
  expect(confirm).toHaveBeenCalledTimes(1);
  confirm.mockRestore();
});

it("エラーが残っていても別の入力欄を修正中にフォーカスを奪わない", () => {
  const router = createMemoryRouter([{ path: "/", element: <ManagedForm method="post"><Field label="企業名"><input name="name" required /></Field><Field label="メールアドレス"><input type="email" name="email" required /></Field><SubmitButton>保存</SubmitButton></ManagedForm> }]);
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole("button", { name: "保存" }));
  expect(screen.getByRole("textbox", { name: "企業名" })).toHaveFocus();
  const email = screen.getByRole("textbox", { name: "メールアドレス" });
  email.focus();
  fireEvent.change(email, { target: { value: "test@" } });
  expect(email).toHaveFocus();
  expect(screen.getByRole("textbox", { name: "企業名" })).toHaveAttribute("aria-invalid", "true");
});
