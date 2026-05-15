import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { PrescriptionPdfData } from './prescription-pdf-data';

interface TextCursor {
  y: number;
}

interface RenderContext {
  document: PDFDocument;
  page: PDFPage;
  regularFont: PDFFont;
  boldFont: PDFFont;
  cursor: TextCursor;
}

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const PAGE_TOP = 790;
const PAGE_BOTTOM = 64;
const LEFT_MARGIN = 48;
const TEXT_LEFT_MARGIN = 58;

@Injectable()
export class PrescriptionPdfRenderer {
  async render(data: PrescriptionPdfData): Promise<Buffer> {
    const pdfDocument = await PDFDocument.create();
    const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const context: RenderContext = {
      document: pdfDocument,
      page: pdfDocument.addPage(PAGE_SIZE),
      regularFont,
      boldFont,
      cursor: { y: PAGE_TOP },
    };

    this.drawTitle(context, data);
    await this.drawQrCode(context, data.qrCodeValue);
    this.drawSection(context, 'Patient', [
      `Name: ${data.patient.name}`,
      `Email: ${data.patient.email}`,
    ]);
    this.drawSection(context, 'Doctor', [
      `Name: ${data.doctor.name}`,
      `Email: ${data.doctor.email}`,
      `Specialty: ${data.doctor.specialty}`,
    ]);
    this.drawSection(context, 'Prescription', [
      `Created at: ${this.formatDate(data.createdAt)}`,
      `Code: ${data.code}`,
      `Status: ${data.status}`,
      `Notes: ${data.notes}`,
    ]);
    this.drawItems(context, data);

    const pdfBytes = await pdfDocument.save();
    return Buffer.from(pdfBytes);
  }

  private drawTitle(context: RenderContext, data: PrescriptionPdfData) {
    context.page.drawText('Medical Prescription', {
      x: LEFT_MARGIN,
      y: context.cursor.y,
      size: 20,
      font: context.boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    context.cursor.y -= 28;
    context.page.drawText(data.code, {
      x: LEFT_MARGIN,
      y: context.cursor.y,
      size: 12,
      font: context.boldFont,
      color: rgb(0.25, 0.25, 0.25),
    });
    context.cursor.y -= 28;
  }

  private async drawQrCode(context: RenderContext, value: string) {
    const dataUrl = await QRCode.toDataURL(value, {
      margin: 1,
      width: 128,
    });
    const imageData = dataUrl.split(',')[1];

    if (!imageData) {
      return;
    }

    const image = await context.document.embedPng(
      Buffer.from(imageData, 'base64'),
    );

    context.page.drawImage(image, {
      x: 455,
      y: 694,
      width: 92,
      height: 92,
    });
    context.page.drawText('Prescription QR', {
      x: 455,
      y: 680,
      size: 8,
      font: context.regularFont,
      color: rgb(0.35, 0.35, 0.35),
    });
  }

  private drawSection(context: RenderContext, title: string, lines: string[]) {
    this.ensureSpace(context, 42);
    context.page.drawText(title, {
      x: LEFT_MARGIN,
      y: context.cursor.y,
      size: 13,
      font: context.boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    context.cursor.y -= 18;

    for (const line of lines) {
      this.drawWrappedText(context, context.regularFont, line);
    }

    context.cursor.y -= 12;
  }

  private drawItems(context: RenderContext, data: PrescriptionPdfData) {
    this.ensureSpace(context, 40);
    context.page.drawText('Items', {
      x: LEFT_MARGIN,
      y: context.cursor.y,
      size: 13,
      font: context.boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    context.cursor.y -= 20;

    data.items.forEach((item, index) => {
      this.drawWrappedText(
        context,
        context.boldFont,
        `${index + 1}. ${item.name}`,
      );
      this.drawWrappedText(
        context,
        context.regularFont,
        `Dosage: ${item.dosage}`,
      );
      this.drawWrappedText(
        context,
        context.regularFont,
        `Quantity: ${item.quantity}`,
      );
      this.drawWrappedText(
        context,
        context.regularFont,
        `Instructions: ${item.instructions}`,
      );
      context.cursor.y -= 8;
    });
  }

  private drawWrappedText(context: RenderContext, font: PDFFont, text: string) {
    const lines = this.wrapText(text, 88);

    for (const line of lines) {
      this.ensureSpace(context, 14);
      context.page.drawText(line, {
        x: TEXT_LEFT_MARGIN,
        y: context.cursor.y,
        size: 10,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      context.cursor.y -= 14;
    }
  }

  private ensureSpace(context: RenderContext, requiredHeight: number) {
    if (context.cursor.y - requiredHeight >= PAGE_BOTTOM) {
      return;
    }

    context.page = context.document.addPage(PAGE_SIZE);
    context.cursor.y = PAGE_TOP;
  }

  private wrapText(text: string, maxLength: number) {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;

      if (candidate.length > maxLength && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private formatDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }
}
