import Client from "@/lib/models/client.model";
import AIProject from "@/lib/models/ai/ai-project";

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
 * Pulled out of the original research route so both the admin-triggered
 * research flow AND the free-chat route can share the exact same
 * find-or-create behavior instead of duplicating it.
 */
export async function getOrCreateAIProject(clientId: string, userId: string) {
  const client = await Client.findById(clientId).lean();

  if (!client) {
    throw new Error("Client not found");
  }

  let project = await AIProject.findOne({
    clientId: client._id,
    status: "active",
  });

  if (!project) {
    const projectName = `${client.brandName || client.name} - AI Project`;

    project = await AIProject.create({
      clientId: client._id,
      name: projectName,
      slug: createSlug(client.brandName || client.name),
      createdBy: userId,
      status: "active",
      lastActivityAt: new Date(),
    });
  } else {
    project.lastActivityAt = new Date();
    await project.save();
  }

  return { client, project };
}