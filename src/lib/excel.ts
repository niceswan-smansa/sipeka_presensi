import ExcelJS from 'exceljs';

const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 12 },
  fill: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0891B2' },
  },
  alignment: { vertical: 'middle', horizontal: 'center' },
};

const BORDER_STYLE: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

export async function exportAbsensiToExcel(
  data: Record<string, any>[],
  filename: string,
  columns?: { header: string; key: string; width?: number }[],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Absensi');

  let headers: { header: string; key: string; width?: number }[];

  if (columns) {
    headers = columns;
  } else if (data.length > 0) {
    headers = Object.keys(data[0]).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      key,
    }));
  } else {
    headers = [];
  }

  const headerRow = sheet.addRow(headers.map((h) => h.header));
  headerRow.eachCell((cell, colNumber) => {
    cell.style = { ...HEADER_STYLE, border: BORDER_STYLE };
    if (headers[colNumber - 1]?.width) {
      sheet.getColumn(colNumber).width = headers[colNumber - 1].width;
    }
  });

  headerRow.height = 24;

  for (const row of data) {
    const dataRow = sheet.addRow(headers.map((h) => row[h.key] ?? ''));
    dataRow.eachCell((cell) => {
      cell.border = BORDER_STYLE;
      cell.alignment = { vertical: 'middle' };
    });
  }

  if (!columns) {
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      if (col.values) {
        for (let i = 1; i <= (col.values.length || 1); i++) {
          const val = col.values[i];
          if (val) {
            const len = String(val).length;
            if (len > maxLen) maxLen = len;
          }
        }
      }
      col.width = Math.min(maxLen + 4, 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  if (typeof window !== 'undefined') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return buffer;
}
