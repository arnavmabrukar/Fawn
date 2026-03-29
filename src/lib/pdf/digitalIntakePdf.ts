"use client";

import { jsPDF } from "jspdf";

type IntakeDocData = {
  parentName: string;
  childName: string;
  age: string | number;
  medicalNotes: string;
  ageCare: string;
  hiddenAllergens: string;
  timestamp: string;
};

const BRAND = {
  name: "Sunshine Daycare",
  subtitle: "Digital Intake Summary",
  supportLine: "Prepared with Fawn AI",
  accent: [29, 59, 54] as const,
  muted: [107, 114, 128] as const,
  body: [31, 41, 55] as const,
};

async function svgToPngDataUrl(path: string, size = 96) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load logo from ${path}`);
  }

  const svgText = await response.text();
  const svgBlob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to render the company logo."));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is unavailable in this browser.");
    }

    context.clearRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function intakeId(data: IntakeDocData) {
  return `${data.timestamp.split("T")[0]}-${data.childName.toLowerCase().slice(0, 3)}`;
}

function buildNarrative(data: IntakeDocData) {
  const medicalSummary =
    data.medicalNotes === "None"
      ? "No immediate medical concerns were reported during intake."
      : `Medical notes reported for ${data.childName} include ${data.medicalNotes}.`;

  const allergenSummary =
    data.medicalNotes === "None"
      ? ""
      : `Additional allergen guidance for staff review: ${data.hiddenAllergens}.`;

  return [
    `This letter summarizes the intake information currently on file for ${data.childName}, a ${data.age}-year-old child associated with parent or guardian ${data.parentName}.`,
    medicalSummary,
    `Developmental and care guidance recorded at intake: ${data.ageCare}.`,
    allergenSummary,
    "This summary is intended for internal review and onboarding preparation before the family tour or enrollment follow-up.",
  ].filter(Boolean);
}

export async function exportDigitalIntakePdf(data: IntakeDocData) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const logoSize = 34;
  let cursorY = margin;
  const availableHeight = pageHeight - margin * 2;
  const narrative = buildNarrative(data);

  const measureWrappedTextHeight = (
    text: string,
    fontSize: number,
    lineGap: number,
    maxWidth = contentWidth,
  ) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    return lines.length * fontSize * 1.15 + Math.max(lines.length - 1, 0) * lineGap;
  };

  const getScale = () => {
    const estimateHeight = (scale: number) => {
      const headerHeight = 62 * scale;
      const introHeight = 34 * scale;
      const closingHeight = 48 * scale;
      const blockSpacing = 8 * scale;
      const sectionGap = 12 * scale;
      const sectionHeadingHeight = 22 * scale;

      let total = headerHeight + introHeight + closingHeight;

      narrative.forEach((paragraph) => {
        total += measureWrappedTextHeight(paragraph, 10 * scale, 1.5 * scale);
        total += blockSpacing;
      });

      total += sectionGap + sectionHeadingHeight;
      total += measureWrappedTextHeight(`Child Name: ${data.childName}`, 10 * scale, 1 * scale) + 4 * scale;
      total += measureWrappedTextHeight(`Age: ${data.age} years old`, 10 * scale, 1 * scale) + 4 * scale;
      total += measureWrappedTextHeight(`Parent / Guardian: ${data.parentName}`, 10 * scale, 1 * scale) + 8 * scale;

      total += sectionGap + sectionHeadingHeight;
      total += measureWrappedTextHeight(
        data.medicalNotes === "None" ? "Medical Notes: No immediate medical concerns reported." : `Medical Notes: ${data.medicalNotes}`,
        10 * scale,
        1 * scale,
      ) + 5 * scale;
      total += measureWrappedTextHeight(
        data.medicalNotes === "None"
          ? "Hidden Allergens: No additional allergen escalation was generated for this intake."
          : `Hidden Allergens / Staff Alert: ${data.hiddenAllergens}`,
        10 * scale,
        1 * scale,
      ) + 8 * scale;

      total += sectionGap + sectionHeadingHeight;
      total += measureWrappedTextHeight(data.ageCare, 10 * scale, 1 * scale) + 10 * scale;

      return total;
    };

    let scale = 1;
    while (scale > 0.72 && estimateHeight(scale) > availableHeight) {
      scale -= 0.04;
    }

    return scale;
  };

  const scale = getScale();
  const sizes = {
    company: 16 * scale,
    meta: 9 * scale,
    salutation: 11 * scale,
    body: 10 * scale,
    section: 11 * scale,
    signoff: 10 * scale,
    dividerGap: 18 * scale,
    paragraphGap: 8 * scale,
    lineGap: 1.5 * scale,
    itemGap: 4 * scale,
    sectionGap: 12 * scale,
  };

  const drawWrappedText = (
    text: string,
    options?: {
      fontSize?: number;
      color?: readonly [number, number, number];
      indent?: number;
      lineGap?: number;
      maxWidth?: number;
      font?: "normal" | "bold" | "italic";
    },
  ) => {
    const fontSize = options?.fontSize ?? 11;
    const lineGap = options?.lineGap ?? 6;
    const indent = options?.indent ?? 0;
    const maxWidth = options?.maxWidth ?? contentWidth - indent;

    pdf.setFont("helvetica", options?.font ?? "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...(options?.color ?? BRAND.body));

    const lines = pdf.splitTextToSize(text, maxWidth);
    const blockHeight = lines.length * fontSize * 1.15 + Math.max(lines.length - 1, 0) * lineGap;

    pdf.text(lines, margin + indent, cursorY, { baseline: "top" });
    cursorY += blockHeight;
  };

  const drawSectionHeading = (title: string) => {
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 10 * scale;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(sizes.section);
    pdf.setTextColor(...BRAND.accent);
    pdf.text(title.toUpperCase(), margin, cursorY);
    cursorY += 12 * scale;
  };

  const logoDataUrl = await svgToPngDataUrl("/fawn-deer.svg");
  pdf.addImage(logoDataUrl, "PNG", margin, cursorY, logoSize, logoSize);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(sizes.company);
  pdf.setTextColor(...BRAND.accent);
  pdf.text(BRAND.name, margin + logoSize + 12, cursorY + 9 * scale);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(sizes.meta);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(BRAND.subtitle, margin + logoSize + 12, cursorY + 22 * scale);
  pdf.text(BRAND.supportLine, margin + logoSize + 12, cursorY + 34 * scale);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(sizes.meta);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(`Date: ${formatDate(data.timestamp)}`, pageWidth - margin, cursorY + 10 * scale, { align: "right" });
  pdf.text(`Document ID: ${intakeId(data)}`, pageWidth - margin, cursorY + 24 * scale, { align: "right" });

  cursorY += 48 * scale;

  pdf.setDrawColor(...BRAND.accent);
  pdf.setLineWidth(1);
  pdf.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += sizes.dividerGap;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(sizes.salutation);
  pdf.setTextColor(...BRAND.body);
  pdf.text("To whom it may concern,", margin, cursorY);
  cursorY += 16 * scale;

  narrative.forEach((paragraph) => {
    drawWrappedText(paragraph, { fontSize: sizes.body, lineGap: sizes.lineGap });
    cursorY += sizes.paragraphGap;
  });

  drawSectionHeading("Family Profile");
  drawWrappedText(`Child Name: ${data.childName}`, { fontSize: sizes.body, lineGap: sizes.lineGap });
  cursorY += sizes.itemGap;
  drawWrappedText(`Age: ${data.age} years old`, { fontSize: sizes.body, lineGap: sizes.lineGap });
  cursorY += sizes.itemGap;
  drawWrappedText(`Parent / Guardian: ${data.parentName}`, { fontSize: sizes.body, lineGap: sizes.lineGap });
  cursorY += sizes.sectionGap;

  drawSectionHeading("Medical and Safety");
  drawWrappedText(
    data.medicalNotes === "None" ? "Medical Notes: No immediate medical concerns reported." : `Medical Notes: ${data.medicalNotes}`,
    { fontSize: sizes.body, lineGap: sizes.lineGap },
  );
  cursorY += 5 * scale;
  drawWrappedText(
    data.medicalNotes === "None"
      ? "Hidden Allergens: No additional allergen escalation was generated for this intake."
      : `Hidden Allergens / Staff Alert: ${data.hiddenAllergens}`,
    { fontSize: sizes.body, lineGap: sizes.lineGap },
  );
  cursorY += sizes.sectionGap;

  drawSectionHeading("Developmental Focus");
  drawWrappedText(data.ageCare, { fontSize: sizes.body, font: "italic", lineGap: sizes.lineGap });
  cursorY += 16 * scale;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(sizes.signoff);
  pdf.setTextColor(...BRAND.body);
  pdf.text("Sincerely,", margin, cursorY);
  cursorY += 16 * scale;
  pdf.setFont("helvetica", "bold");
  pdf.text("Fawn AI Intake Assistant", margin, cursorY);
  cursorY += 12 * scale;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...BRAND.muted);
  pdf.text(BRAND.name, margin, cursorY);

  pdf.save(`intake-summary-${intakeId(data)}.pdf`);
}
