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
  line: [220, 227, 232] as const,
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

function buildOverview(data: IntakeDocData) {
  return [
    `${data.childName} is a ${data.age}-year-old child associated with parent or guardian ${data.parentName}. This summary is intended for internal intake review and enrollment follow-up.`,
    data.medicalNotes === "None"
      ? "No immediate medical concerns were reported during intake."
      : `Reported medical notes include ${data.medicalNotes}.`,
    `Developmental guidance recorded at intake focuses on ${data.ageCare.charAt(0).toLowerCase()}${data.ageCare.slice(1)}`,
  ];
}

export async function exportDigitalIntakePdf(data: IntakeDocData) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 48;
  const marginY = 62;
  const contentWidth = pageWidth - marginX * 2;
  const overview = buildOverview(data);
  const medicalSummary =
    data.medicalNotes === "None" ? "No immediate medical concerns reported." : data.medicalNotes;
  const allergenSummary =
    data.medicalNotes === "None" ? "No additional allergen guidance generated." : data.hiddenAllergens;

  const measureTextBlock = (text: string, fontSize: number, maxWidth = contentWidth, lineGap = 2) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    return lines.length * fontSize * 1.15 + Math.max(lines.length - 1, 0) * lineGap;
  };

  const getScale = () => {
    const estimate = (scale: number) => {
      const overviewHeight = overview.reduce((sum, paragraph) => {
        return sum + measureTextBlock(paragraph, 10 * scale, contentWidth, 2 * scale) + 8 * scale;
      }, 0);

      const profileHeight =
        measureTextBlock(`Child Name: ${data.childName}`, 10 * scale) +
        measureTextBlock(`Age Group: ${data.age} Years Old`, 10 * scale) +
        measureTextBlock(`Parent / Guardian: ${data.parentName}`, 10 * scale) +
        20 * scale;

      const medicalHeight =
        measureTextBlock(medicalSummary, 10 * scale) +
        measureTextBlock(`Staff Alert: ${allergenSummary}`, 9 * scale) +
        20 * scale;

      const developmentalHeight = measureTextBlock(data.ageCare, 10 * scale, contentWidth, 2 * scale) + 16 * scale;

      return (
        92 * scale +
        overviewHeight +
        profileHeight +
        medicalHeight +
        developmentalHeight +
        88 * scale +
        84 * scale
      );
    };

    let scale = 1;
    while (scale > 0.68 && estimate(scale) > (pageHeight - marginY * 2) * 0.98) {
      scale -= 0.04;
    }
    return scale;
  };

  const scale = getScale();
  const sizes = {
    title: 18 * scale,
    subtitle: 10 * scale,
    meta: 9 * scale,
    section: 12 * scale,
    body: 10 * scale,
    small: 9 * scale,
    signoff: 10 * scale,
  };

  let cursorY = marginY;

  const drawWrappedText = (
    text: string,
    options?: {
      fontSize?: number;
      font?: "normal" | "bold" | "italic";
      color?: readonly [number, number, number];
      maxWidth?: number;
      lineGap?: number;
      x?: number;
    },
  ) => {
    const fontSize = options?.fontSize ?? sizes.body;
    const maxWidth = options?.maxWidth ?? contentWidth;
    const lineGap = options?.lineGap ?? 2 * scale;
    const x = options?.x ?? marginX;

    pdf.setFont("helvetica", options?.font ?? "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...(options?.color ?? BRAND.body));

    const lines = pdf.splitTextToSize(text, maxWidth);
    const blockHeight = lines.length * fontSize * 1.15 + Math.max(lines.length - 1, 0) * lineGap;
    pdf.text(lines, x, cursorY, { baseline: "top" });
    cursorY += blockHeight;
  };

  const drawDivider = (gapTop = 0, gapBottom = 12 * scale) => {
    cursorY += gapTop;
    pdf.setDrawColor(...BRAND.line);
    pdf.setLineWidth(1);
    pdf.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += gapBottom;
  };

  const drawSectionTitle = (title: string) => {
    drawDivider(6 * scale, 10 * scale);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(sizes.section);
    pdf.setTextColor(...BRAND.accent);
    pdf.text(title.toUpperCase(), marginX, cursorY);
    cursorY += 14 * scale;
  };

  const logoDataUrl = await svgToPngDataUrl("/fawn-deer.svg");
  pdf.addImage(logoDataUrl, "PNG", marginX, cursorY + 2 * scale, 26 * scale, 26 * scale);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(sizes.title);
  pdf.setTextColor(...BRAND.accent);
  pdf.text(BRAND.name, marginX + 38 * scale, cursorY + 11 * scale);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(sizes.subtitle);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(BRAND.subtitle, marginX + 38 * scale, cursorY + 24 * scale);
  pdf.text(BRAND.supportLine, marginX + 38 * scale, cursorY + 35 * scale);

  pdf.setFontSize(sizes.meta);
  pdf.text(`Date: ${formatDate(data.timestamp)}`, pageWidth - marginX, cursorY + 12 * scale, { align: "right" });
  pdf.text(`Document ID: ${intakeId(data)}`, pageWidth - marginX, cursorY + 25 * scale, { align: "right" });

  cursorY += 46 * scale;
  drawDivider(0, 16 * scale);

  overview.forEach((paragraph) => {
    drawWrappedText(paragraph, { fontSize: sizes.body, lineGap: 2 * scale });
    cursorY += 8 * scale;
  });

  drawSectionTitle("Family Profile");
  drawWrappedText(`Child Name: ${data.childName}`, { fontSize: sizes.body, font: "bold" });
  cursorY += 4 * scale;
  drawWrappedText(`Age Group: ${data.age} Years Old`, { fontSize: sizes.body, font: "bold" });
  cursorY += 4 * scale;
  drawWrappedText(`Parent / Guardian: ${data.parentName}`, { fontSize: sizes.body, font: "bold" });

  drawSectionTitle("Medical and Safety");
  drawWrappedText(`Medical Notes: ${medicalSummary}`, { fontSize: sizes.body, lineGap: 2 * scale });
  cursorY += 6 * scale;
  drawWrappedText(`Staff Alert: ${allergenSummary}`, {
    fontSize: sizes.small,
    color: BRAND.muted,
    lineGap: 2 * scale,
  });

  drawSectionTitle("Developmental Focus");
  drawWrappedText(data.ageCare, {
    fontSize: sizes.body,
    font: "italic",
    lineGap: 2 * scale,
  });

  cursorY += 18 * scale;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(sizes.signoff);
  pdf.setTextColor(...BRAND.body);
  pdf.text("Sincerely,", marginX, cursorY);
  cursorY += 18 * scale;
  pdf.setFont("helvetica", "bold");
  pdf.text("Fawn AI Intake Assistant", marginX, cursorY);
  cursorY += 12 * scale;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...BRAND.muted);
  pdf.text(BRAND.name, marginX, cursorY);

  pdf.save(`intake-summary-${intakeId(data)}.pdf`);
}
