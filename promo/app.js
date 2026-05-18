document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  const id = button.getAttribute("data-copy");
  const node = document.getElementById(id);
  if (!node) return;
  await navigator.clipboard.writeText(node.textContent.trim());
  const old = button.textContent;
  button.textContent = "已复制";
  setTimeout(() => {
    button.textContent = old;
  }, 1200);
});
