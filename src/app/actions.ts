"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { createLimiter } from "@/lib/ratelimit";
import { currentUser, endSession, startSession } from "@/lib/session";
import { parseOrigins } from "@/lib/cors";
import {
  ConflictError,
  addRoadmapItem,
  createProject,
  createUser,
  deleteRoadmapItem,
  getOwnedProject,
  getUserByEmail,
  listProjects,
  promoteFeedback,
  setFeedbackStatus,
  updateProject,
  updateRoadmapItem,
} from "@/lib/repo";
import {
  FEEDBACK_STATUSES,
  FREE_PROJECT_LIMIT,
  projectSchema,
  roadmapSchema,
  signupSchema,
} from "@/lib/validation";

const authLimiter = createLimiter(10, 15 * 60 * 1000);
const DUMMY_HASH = hashPassword("not-a-real-password");

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const enc = encodeURIComponent;

async function clientKey() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function signup(form: FormData) {
  if (!authLimiter(`auth:${await clientKey()}`))
    redirect(`/signup?error=${enc("Trop d'essais. Réessayez dans 15 minutes.")}`);
  const parsed = signupSchema.safeParse({
    email: str(form, "email"),
    password: str(form, "password"),
  });
  if (!parsed.success) redirect(`/signup?error=${enc(parsed.error.issues[0].message)}`);
  let userId: number;
  try {
    userId = createUser(getDb(), parsed.data.email, hashPassword(parsed.data.password));
  } catch (e) {
    if (e instanceof ConflictError)
      redirect(`/signup?error=${enc("Un compte existe déjà avec cet email")}`);
    throw e;
  }
  await startSession(userId);
  redirect("/dashboard");
}

export async function login(form: FormData) {
  if (!authLimiter(`auth:${await clientKey()}`))
    redirect(`/login?error=${enc("Trop d'essais. Réessayez dans 15 minutes.")}`);
  const user = getUserByEmail(getDb(), str(form, "email").trim().toLowerCase());
  const ok = verifyPassword(str(form, "password"), user?.pw_hash ?? DUMMY_HASH) && !!user;
  if (!ok || !user) redirect(`/login?error=${enc("Email ou mot de passe incorrect")}`);
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/");
}

async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

async function requireProject(form: FormData) {
  const user = await requireUser();
  const id = Number(str(form, "projectId"));
  const project = getOwnedProject(getDb(), user.id, id);
  if (!project) redirect("/dashboard");
  return {
    user,
    project,
    back: (m: string, k: "ok" | "err" = "ok") =>
      redirect(`/dashboard/${project.id}?${k}=${enc(m)}`),
  };
}

export async function newProject(form: FormData) {
  const user = await requireUser();
  const db = getDb();
  if (user.plan !== "pro" && listProjects(db, user.id).length >= FREE_PROJECT_LIMIT)
    redirect(`/dashboard?err=${enc("Le plan gratuit est limité à 1 projet")}`);
  const name = str(form, "name").trim();
  if (!name || name.length > 60)
    redirect(`/dashboard?err=${enc("Nom du projet requis (60 caractères max)")}`);
  const { id } = createProject(db, user.id, name);
  redirect(`/dashboard/${id}?ok=${enc("Projet créé")}`);
}

export async function saveProject(form: FormData) {
  const { user, project, back } = await requireProject(form);
  const { origins, invalid } = parseOrigins(str(form, "origins"));
  if (invalid.length) back(`Site invalide : ${invalid[0]} (ex. https://monsite.ma)`, "err");
  const parsed = projectSchema.safeParse({
    name: str(form, "name"),
    accent: str(form, "accent"),
    origins: origins.join("\n"),
  });
  if (!parsed.success) back(parsed.error.issues[0].message, "err");
  else {
    updateProject(getDb(), user.id, project.id, parsed.data);
    back("Réglages enregistrés");
  }
}

function itemFields(form: FormData) {
  return roadmapSchema.safeParse({
    title: str(form, "title"),
    description: str(form, "description"),
    status: str(form, "status"),
    visible: form.get("visible") === "on",
  });
}

export async function addItem(form: FormData) {
  const { project, back } = await requireProject(form);
  const p = itemFields(form);
  if (!p.success) back(p.error.issues[0].message, "err");
  else {
    addRoadmapItem(getDb(), project.id, p.data);
    back("Élément ajouté à la roadmap");
  }
}

export async function saveItem(form: FormData) {
  const { project, back } = await requireProject(form);
  const p = itemFields(form);
  if (!p.success) back(p.error.issues[0].message, "err");
  else {
    updateRoadmapItem(getDb(), project.id, Number(str(form, "id")), p.data);
    back("Élément enregistré");
  }
}

export async function removeItem(form: FormData) {
  const { project, back } = await requireProject(form);
  deleteRoadmapItem(getDb(), project.id, Number(str(form, "id")));
  back("Élément supprimé");
}

export async function markFeedback(form: FormData) {
  const { project, back } = await requireProject(form);
  const status = str(form, "status");
  if (!(FEEDBACK_STATUSES as readonly string[]).includes(status)) back("Statut invalide", "err");
  else {
    setFeedbackStatus(getDb(), project.id, Number(str(form, "id")), status);
    back("Message mis à jour");
  }
}

export async function promote(form: FormData) {
  const { project, back } = await requireProject(form);
  const id = promoteFeedback(getDb(), project.id, Number(str(form, "id")));
  back(id ? "Ajouté à la roadmap" : "Message introuvable", id ? "ok" : "err");
}
