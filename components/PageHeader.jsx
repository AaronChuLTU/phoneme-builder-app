/**
 * PageHeader
 *
 * The title and introductory sentence that opens every page.
 *
 * This exists because the spacing between a page title and its intro was
 * being set page by page, which drifted into three different values. Putting
 * it in one component means the relationship is defined once and every page
 * inherits it — changing the gap here changes it everywhere, and no page can
 * quietly disagree.
 *
 * Usage:
 *   <PageHeader title="Settings">
 *     These preferences are saved in your browser as cookies.
 *   </PageHeader>
 *
 * The intro is optional; a page can pass a title alone.
 */

export default function PageHeader({ title, children }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-2xl font-bold">{title}</h2>
      {children && (
        <p className="max-w-2xl text-[var(--text-muted)]">{children}</p>
      )}
    </div>
  );
}
