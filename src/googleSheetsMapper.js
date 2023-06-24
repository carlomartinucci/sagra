const GoogleSheetsMapper = {
  async fetchGoogleSheetsData({
    sheetsOptions = [],
  }) {
    try {
      const response = await fetchBatchData({
        apiKey: process.env.REACT_APP_SHEETS_API_KEY,
        sheetId: process.env.REACT_APP_SHEET_ID,
        sheetsOptions
      });

      console.log(response)
      return mapData({ sheets: response.valueRanges, sheetsOptions });
    } catch (error) {
      throw error;
    }
  },
};

export const fetchGoogleSheetsData = GoogleSheetsMapper.fetchGoogleSheetsData

// Utils

const GOOGLE_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

const getBatchUrl = (
  sheetId,
  sheetsNames,
  apiKey,
) => {
  // ranges=Sheet1&ranges=Sheet2
  const rangesQueryString = sheetsNames.map((sheetName) => `ranges=${sheetName}`).join('&');;

  return `${GOOGLE_API_URL}/${sheetId}/values:batchGet?${rangesQueryString}&key=${apiKey}`;
};

class ApiResponseError extends Error {
  constructor(message, response) {
    super(message);
    Object.setPrototypeOf(this, ApiResponseError.prototype);
    this.response = response;
    Error.captureStackTrace(this, ApiResponseError);
  }
}

const mapRecords = (records, headerData) => {
  return records
    .filter(record => record.length > 0)
    .map(record =>
      record.reduce(
        (obj, item, index) => {
          obj[headerData[index]] = item;
          return obj;
        },
        {},
      ),
    );
};

export const mapData = ({
  sheets,
  sheetsOptions = [],
}) => {
  return sheets.map(sheet => {
    const id = sheet.range.split('!')[0].replace(/'/g, '');
    const rows = sheet.values || [];

    if (rows.length > 0) {
      const sheetsOptionsSheet = sheetsOptions.find(
        sheet => sheet.id === id,
      );
      const headerRowIndex = sheetsOptionsSheet?.headerRowIndex ?? 0;
      const header = rows[headerRowIndex];
      const records = rows.filter((_, index) => index > headerRowIndex);
      const recordsData = mapRecords(records, header);

      return {
        id,
        data: recordsData,
      };
    }

    return {
      id,
      data: [],
    };
  });
};

export const fetchBatchData = async ({
  apiKey,
  sheetId,
  sheetsOptions = [],
}) => {
  const sheetsNames = sheetsOptions.map((option) => option.id);
  const url = getBatchUrl(sheetId, sheetsNames, apiKey);
  
  try {
    const response = await fetch(url, {});

    if (!response.ok) {
      throw new ApiResponseError(
        `Request to '${url}' failed with ${response.status}${
          response.statusText ? `: ${response.statusText}` : ''
        }`,
        {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        },
      );
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};
