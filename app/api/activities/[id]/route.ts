/**
 * app/api/activities/[id]/route.ts
 *
 *   GET    /api/activities/:id
 *   PATCH  /api/activities/:id
 *   DELETE /api/activities/:id
 */

import { prisma } from "@/lib/prisma";
import { ok, fail, notFound, handle, parseId, readJson } from "@/lib/api";
import { validateActivity } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        wordList: {
          select: { id: true, name: true, _count: { select: { words: true } } },
        },
      },
    });
    if (!activity) return notFound("Activity");

    return ok(activity);
  });
}

export async function PATCH(request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const body = await readJson(request);
    if (body === null) return fail("Request body must be valid JSON");

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return notFound("Activity");

    const result = validateActivity(body);
    if (!result.ok) return fail("Validation failed", 400, result.errors);

    const list = await prisma.wordList.findUnique({
      where: { id: result.value.wordListId },
    });
    if (!list) return fail("That word list does not exist", 400);

    const updated = await prisma.activity.update({
      where: { id },
      data: result.value,
    });

    return ok(updated);
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  return handle(async () => {
    const { id: raw } = await params;
    const id = parseId(raw);
    if (id === null) return fail("Invalid id");

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) return notFound("Activity");

    await prisma.activity.delete({ where: { id } });

    return ok({ deleted: true, id, name: existing.name });
  });
}
