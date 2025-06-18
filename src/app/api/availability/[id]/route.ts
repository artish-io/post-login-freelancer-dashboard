import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const filePath = path.join(process.cwd(), "data", "freelancers.json");
    const data = await readFile(filePath, "utf-8");
    const freelancers = JSON.parse(data);

    const user = freelancers.find((f: any) => String(f.id) === id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      availability: user.availability || "Unavailable",
    });
  } catch (error) {
    console.error("Error reading availability:", error);
    return NextResponse.json(
      { error: "Failed to read availability" },
      { status: 500 }
    );
  }
}
