import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("Bericht");
ws.addRow(["header1", "header2"]);
const spacer = ws.addRow([]);
spacer.height = 10;
ws.addRow(["data1", "data2"]);

console.log("in-memory height before write:", ws.getRow(2).height);

const buf = await wb.xlsx.writeBuffer();

const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.load(buf);
const ws2 = wb2.getWorksheet("Bericht");
console.log("round-tripped height:", ws2.getRow(2).height);
console.log("row 2 cell count:", ws2.getRow(2).cellCount);
