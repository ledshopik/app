/**
 * ═══════════════════════════════════════════════════════════════
 *  KALKULÁTOR INSTALACÍ — Apps Script backend
 *  LEDshopik · interní nástroj
 * ═══════════════════════════════════════════════════════════════
 *
 *  NÁVOD K NASAZENÍ:
 *  1. Otevři https://script.google.com → Nový projekt
 *  2. Smaž obsah Code.gs a vlož celý tento kód
 *  3. Ulož (Ctrl+S)
 *  4. Klikni Nasadit → Nové nasazení
 *     - Typ: Webová aplikace
 *     - Spouštět jako: Já
 *     - Přístup: Kdokoli
 *  5. Zkopíruj URL a vlož do kalkulator-instalaci.html (SCRIPT_URL)
 *  6. Spusť funkci initSheets() (menu Spustit → initSheets) — vytvoří listy
 *
 *  LISTY:
 *  - config   — klíč/hodnota (sazba_km, sazba_cestovni, sazba_hodina, home_psc)
 *  - sazby    — sazby za metr per typ+montáž+pásek+příprava
 *  - doplnky  — doplňkové práce (paušál/hodiny)
 *  - kalkulace — historie kalkulací
 */

/* ═══ INIT ═══ */
function initSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Config
  var cfg = ss.getSheetByName('config');
  if (!cfg) {
    cfg = ss.insertSheet('config');
    cfg.getRange(1, 1, 1, 2).setValues([['klic', 'hodnota']]);
    cfg.getRange(2, 1, 4, 2).setValues([
      ['sazba_km', '15'],
      ['sazba_cestovni', '300'],
      ['sazba_hodina', '1000'],
      ['home_psc', '61900']
    ]);
    cfg.setFrozenRows(1);
  }

  // Sazby
  var saz = ss.getSheetByName('sazby');
  if (!saz) {
    saz = ss.insertSheet('sazby');
    saz.getRange(1, 1, 1, 6).setValues([['id', 'typ_instalace', 'zpusob_montaze', 'typ_pasku', 'priprava', 'sazba_za_metr']]);
    saz.setFrozenRows(1);
  }

  // Doplnky
  var dop = ss.getSheetByName('doplnky');
  if (!dop) {
    dop = ss.insertSheet('doplnky');
    dop.getRange(1, 1, 1, 5).setValues([['id', 'nazev', 'typ', 'cena', 'poznamka']]);
    dop.setFrozenRows(1);
  }

  // Kalkulace
  var kal = ss.getSheetByName('kalkulace');
  if (!kal) {
    kal = ss.insertSheet('kalkulace');
    kal.getRange(1, 1, 1, 12).setValues([['id', 'datum', 'zakaznik', 'psc', 'km', 'polozky_json', 'doprava', 'prace', 'doplnky_cena', 'celkem_od', 'celkem_do', 'poznamka']]);
    kal.setFrozenRows(1);
  }
}

/* ═══ GET ═══ */
function doGet(e) {
  var modul = (e.parameter.modul || '').toString().trim();
  if (!modul) return jsonResp({ ok: false, error: 'Chybí parametr modul' });

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(modul);
  if (!sheet) return jsonResp({ ok: false, error: 'List "' + modul + '" neexistuje' });

  var data = sheetToArray(sheet);
  return jsonResp({ ok: true, data: data });
}

/* ═══ POST ═══ */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = String(body.action || '');
    var modul = String(body.modul || '');

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(modul);
    if (!sheet) return jsonResp({ ok: false, error: 'List "' + modul + '" neexistuje' });

    switch (action) {
      case 'append':
        return doAppend(sheet, body.record);
      case 'update':
        return doUpdate(sheet, body.record);
      case 'delete':
        return doDelete(sheet, String(body.id || ''));
      case 'replaceAll':
        return doReplaceAll(sheet, body.records || []);
      default:
        return jsonResp({ ok: false, error: 'Neznámá akce: ' + action });
    }
  } catch (err) {
    return jsonResp({ ok: false, error: err.toString() });
  }
}

/* ═══ CRUD ═══ */

function doAppend(sheet, record) {
  if (!record) return jsonResp({ ok: false, error: 'Chybí record' });
  var headers = getHeaders(sheet);
  var row = headers.map(function(h) { return String(record[h] || ''); });
  sheet.appendRow(row);
  return jsonResp({ ok: true });
}

function doUpdate(sheet, record) {
  if (!record || !record.id) return jsonResp({ ok: false, error: 'Chybí record.id' });
  var headers = getHeaders(sheet);
  var idCol = headers.indexOf('id');
  if (idCol < 0) return jsonResp({ ok: false, error: 'List nemá sloupec id' });

  var data = sheet.getDataRange().getValues();
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(record.id)) {
      var row = headers.map(function(h) { return String(record[h] !== undefined ? record[h] : data[r][headers.indexOf(h)] || ''); });
      sheet.getRange(r + 1, 1, 1, row.length).setValues([row]);
      return jsonResp({ ok: true });
    }
  }
  return jsonResp({ ok: false, error: 'Záznam nenalezen: ' + record.id });
}

function doDelete(sheet, id) {
  if (!id) return jsonResp({ ok: false, error: 'Chybí id' });
  var headers = getHeaders(sheet);
  var idCol = headers.indexOf('id');
  if (idCol < 0) return jsonResp({ ok: false, error: 'List nemá sloupec id' });

  var data = sheet.getDataRange().getValues();
  for (var r = data.length - 1; r >= 1; r--) {
    if (String(data[r][idCol]) === id) {
      sheet.deleteRow(r + 1);
      return jsonResp({ ok: true });
    }
  }
  return jsonResp({ ok: false, error: 'Záznam nenalezen: ' + id });
}

/**
 * replaceAll — smaže všechna data (ne header) a nahradí novými.
 * Používá se pro bulk uložení sazeb/doplňků/configu.
 */
function doReplaceAll(sheet, records) {
  var headers = getHeaders(sheet);
  var lastRow = sheet.getLastRow();

  // Smazat stará data (řádky 2+)
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    if (lastRow > 2) {
      // Delete extra rows to keep it clean
      try { sheet.deleteRows(3, lastRow - 2); } catch(e) {}
    }
  }

  // Zapsat nová data
  if (records.length > 0) {
    var rows = records.map(function(rec) {
      return headers.map(function(h) { return String(rec[h] || ''); });
    });
    // Ensure enough rows
    if (rows.length > 1) {
      sheet.insertRowsAfter(2, rows.length - 1);
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  return jsonResp({ ok: true });
}

/* ═══ HELPERS ═══ */

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h).trim();
  });
}

function sheetToArray(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var result = [];
  for (var r = 1; r < data.length; r++) {
    var obj = {};
    var hasData = false;
    for (var c = 0; c < headers.length; c++) {
      var val = String(data[r][c] || '').trim();
      obj[headers[c]] = val;
      if (val) hasData = true;
    }
    if (hasData) result.push(obj);
  }
  return result;
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
