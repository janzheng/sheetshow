import { Hono } from 'hono'
import { Sema } from 'async-sema'
import slugify from 'slugify'
import Sqids from 'sqids'

import YAML from 'yaml'

import { formatDate } from './utils';

const sqids = new Sqids()





const USE_CACHE = true
const CACHE_SECONDS = 60 * 60; // 60s * 60m * 24h // update cache every hour for prod
// const CACHE_SECONDS = 60; // 60s * 60m * 24h // update every minute for testing
// const CACHE_SECONDS = 60 * 60 * 24; // 60s * 60m * 24h // update cache every day for prod
const semaGet = new Sema(5) // Semaphore with limit of 5 concurrent requests (Sheets limit)
const semaAdd = new Sema(2) // Semaphore with limit of 5 concurrent requests (Sheets limit)
const app = new Hono()

let SHEET_URL
// const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcjDaOXTzTndkTW3u9UFKtk3rrctxGtcrvCUA5h7nLWCbeJok049ruZx6Qbs6VIKQH/exec'; // open-phage
// SHEET_URL = 'https://script.google.com/macros/s/AKfycbz4MkVigBY6nRgon7GHKEbTARiSm6KxPjG1diNwUVd-I8KY3yAmdLFHu9CVmVx-gO9u/exec'; // sheet-manipulator
// SHEET_URL = 'https://script.google.com/macros/s/AKfycbxU_qqJcYVhAp5dHK8ToRNXgsznmqIW85X6hqqck2NKuU2M0w6_ShOHBQhxBK4g9t62/exec'; // Dos!
SHEET_URL = 'https://script.google.com/macros/s/AKfycbzj9Y1H6Ku-Lkgi6T0zKxGH6Jl7AOK7N-1y2U8tqqBbzNH3p9F_usTpUzwL2nfywOfC/exec'; // v2 w/ columns

// These sheets are default; others sheets may be loaded thru Configs
const sheets = ["Logs", "Configs"]

// Function to perform all the fetches
const fetchAll = async ({ sheetUrl, c }) => {
  let cacheKey = JSON.stringify({ sheetUrl, sheets })
  const responses = await Promise.all(sheets.map(async sheetName => {
    await semaGet.acquire()
    let response
    try {
      // console.log(">>>> FETCHING", config)
      // Check if response is in cache
      let cachedResponse = USE_CACHE && await c.env.CACHE.get(cacheKey)
      if (!cachedResponse) {
        // If not in cache, fetch using fetchSheet and store in cache
        response = await fetchSheet({ sheet: sheetName, sheetUrl })
        await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: CACHE_SECONDS })
      } else {
        response = JSON.parse(cachedResponse)
      }
    } finally {
      semaGet.release()
    }
    return response
  }))

  // Create an object where each key is a sheet name and each value is the corresponding response data
  const data = {}
  for (let i = 0; i < sheets.length; i++) {
    data[sheets[i]] = responses[i]
  }
  return data
}

// fetch just one sheet
const fetchSheet = async ({ sheet, sheetUrl = SHEET_URL }) => {
  const response = await fetch(sheetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "method": "GET",
      "sheet": sheet
    })
  })
  try {
    const data = await response.json()
    return data
  } catch(e) {
    console.error('[fetchSheet JSON]', sheet, e, response)
  }
}

const find = async ({
  column = null,
  value = null,
  sheet = 'Logs',
  match = 'exact', // or 'contains' or 'regex'
  sheetUrl = SHEET_URL
}) => {
  // Fetch all rows from the sheet
  const allRows = await fetchSheet({ sheet, sheetUrl });

  // Filter rows based on the criteria
  const filteredRows = allRows?.data?.filter(row => {
    // If column is not provided, search across all columns
    if (!column) {
      return Object.values(row).some(cell => matchCell(cell, value, match));
    } else {
      return matchCell(row[column], value, match);
    }
  });

  return filteredRows || [];
}

// Helper function to match a cell with a value based on the match type
const matchCell = (cell, value, match) => {
  // console.log('cell: cell', cell)
  if (match === 'exact') {
    return cell === value;
  } else if (match === 'contains') {
    return cell && String(cell).includes(value);
  } else if (match === 'regex') {
    const regex = new RegExp(value);
    return cell && regex.test(String(cell));
  }
  return false;
}

export const getConfigs = async ({ name = null, sheetUrl = SHEET_URL }) => {
  const result = await fetchSheet({ sheet: 'Configs', sheetUrl })
  const configs = {}
  for (let cfg of result?.data) {
    configs[cfg.Name] = {
      ...cfg,
      Schema: YAML.parse(cfg.Schema)
    }
  }
  if (name && configs[name]) {
    return configs[name]
  }
  return { configs }
  // return { configs, data: result.data }
}


// add a new row to a SHEET_URL + Sheet; default to "Logs"
// data needs to match the schema of the sheet or it won't work!
export const add = async ({ payload, sheet = 'Logs', sheetUrl = SHEET_URL }) => {
  // force yaml-ify payload.Data since Sheets does weird things to JSON
  if (payload.Data) {
    try {
      payload.Data = YAML.stringify(payload.Data)
    } catch (e) { }
  }

  let data;
  await semaAdd.acquire();
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "method": "POST",
        "sheet": sheet,
        payload: {
          ...payload,
          "Date Modified": formatDate(new Date()),
        },
      })
    })
    data = await response.json()
  } finally {
    semaAdd.release();
  }
  return data
}

// works almost just like add
// ID = row # to update
// replaces the entire row with the payload
export const put = async ({ id, payload, sheet = 'Logs', sheetUrl = SHEET_URL }) => {
  if (!id) {
    throw new Error('[put] id is required')
  }

  // force yaml-ify payload.Data since Sheets does weird things to JSON
  if (payload.Data) {
    try {
      payload.Data = YAML.stringify(payload.Data)
    } catch (e) { }
  }

  let data;
  await semaAdd.acquire();
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "method": "PUT",
        "sheet": sheet,
        "id": id,
        payload: {
          ...payload,
          "Date Modified": formatDate(new Date()),
        },
      })
    })
    data = await response.json()
  } finally {
    semaAdd.release();
  }
  return data
}


// given a sheet, key, and value; 
// try to find the row to get id and payload
// if not found, add
// if found, update
export const update = async ({ key = "Name", value, payload, sheet = 'Logs', sheetUrl = SHEET_URL }) => {

  if(!value) {
    // e.g. if Name already exists in payload, use it
    value = payload[key]
  }

  console.log("[update] finding w/ kv:", key, value)

  // Try to find the row
  const rows = await find({ column: key, value: value, sheet, sheetUrl });

  // If row is found, update it
  if (rows.length > 0) {
    const id = rows[0]._id; // Assume the id is stored in _id field
    return await put({ id, payload: { ...rows[0], ...payload}, sheet, sheetUrl });
  }

  // If row is not found, add a new one
  return await add({ payload, sheet, sheetUrl });
}





// add to log; event sourcing; should happen on every action
const addLog = async (data, logId) => {
  let result;
  let settings = data?.settings;
  let getLogs = data?.settings?.getLogs || false;
  const sheetUrl = data?.settings?.sheetUrl;
  let dataColumn = data.columns.Data;
  let addObj;

  let message = null;

  // console.log('[addLog]:', JSON.stringify(data));

  if (data.Data) {
    // sometimes GPT will forget to put the Data key in columns
    dataColumn = data.Data;
  }

  if (data.columns) {
    // spread .Data's keys into the payload itself
    // this lets us add arbitrary data to the sheet as columns
    // this is necessary since GPT can't arbitrarily add params to a request
    // w/o specifying it in the yaml config

    // sometimes a response won't have columns.Data and it'll just be in the columns{} itself
    // we add all these columns (that are not User or Assistant) to columns.Data for logging
    if (!dataColumn) {
      dataColumn = {};
      Object.keys(data.columns).forEach(key => {
        if (key !== 'User' && key !== 'Assistant') {
          dataColumn[key] = data.columns[key];
        }
      });
    }

    let payloadObj = {
      ...data.columns,
      ...data.columns?.Data || null,
      Data: dataColumn,
      Type: settings?.Type,
    };

    if (logId) {
      payloadObj.id = logId;
    }

    addObj = { sheet: "Logs", payload: payloadObj, sheetUrl }
    // addObj = { sheet: "Logs", payload: { ...data.columns, Type: settings?.Type, Data: dataColumn}, sheetUrl }
    await add(addObj);
    message = `Added to the logs.`;
  } else {
    message = `No columns provided.`;
  }

  if (getLogs)
    result = await fetchSheet({ sheet: 'Logs', sheetUrl });

  return { ...result, message, addObj };
}

// append to the sheet, similar to addLog but for any sheet
const append = async ({ sheet, payload, schema }) => {
  // let settings = data?.settings;
  // const sheetUrl = data?.settings?.sheetUrl;
  // let dataColumn = data.columns.Data;
  let addObj;
  let appendData = {}


  console.log('[append]:', sheet, payload, schema);
  // enforce the schema
  // todo: THIS WILL PROBABLY EASILY BREAK
  Object.keys(schema).forEach(key => {
    appendData[key] = YAML.stringify(payload[key])?.trim();
  });

  addObj = { sheet, payload: { ...appendData } }
  let result = await add(addObj);
  // message = `Added to the logs.`;
  // } else {
  // message = `No columns provided.`;
  // }

  return result;
}















/* 

  Getters

*/
import moment from 'moment-timezone';

// Function to get the current time
const getCurrentTime = (location) => {
  let time;
  if (location) {
    time = moment().tz(location).format();
  } else {
    time = moment.utc().format();
  }
  return time;
}

// Use the function in your endpoint
app.get('/time', async (c) => {
  const location = c.req.query('location');
  const time = getCurrentTime(location);
  return c.json({ time });
});

app.get('/configs', async (c) => {
  const configName = c.req.query('name')
  const sheetUrl = c.req.query('sheetUrl')
  const location = c.req.query('location');
  const time = getCurrentTime(location);
  const config = await getConfigs({ name: configName, sheetUrl })
  return c.json({ ...config, time })
})
app.get('/logs', async (c) => {
  const sheetUrl = c.req.query('sheetUrl')
  const location = c.req.query('location');
  const time = getCurrentTime(location);
  const result = await fetchSheet({ sheet: 'Logs', sheetUrl })
  return c.json({ ...result, time })
})
app.get('/columns', async (c) => {
  try {
    const columnNames = c.req.query('names').split(',').map(name => name.trim()) || "Data"
    const sheetName = c.req.query('sheet') || "Logs"
    const sheetUrl = c.req.query('sheetUrl')
    const location = c.req.query('location');
    const time = getCurrentTime(location);
    const result = await fetchSheet({ sheet: sheetName, sheetUrl })
    // Filter the result data based on the given column names
    const filteredData = result.data.map(row => {
      return columnNames.reduce((obj, columnName) => {
        obj._id = row._id
        obj[columnName] = row[columnName]
        return obj
      }, {})
    })

    return c.json({ data: filteredData, time })
  } catch(e) {
    console.log('[columns]',e)
  }
})

app.get('/sheet', async (c) => {
  try {
    const sheetName = c.req.query('sheet') || "Logs"
    const sheetUrl = c.req.query('sheetUrl')
    const location = c.req.query('location');
    const time = getCurrentTime(location);
    const result = await fetchSheet({ sheet: sheetName, sheetUrl })
    return c.json({ data: result, time })
  } catch (e) {
    console.log('[sheet]', e)
  }
})


/* 

  Find a Log

*/
app.get('/find', async (c) => {
  try {
    const { column, value, sheet, match, sheetUrl } = c.req.query();
    const location = c.req.query('location');
    const time = getCurrentTime(location);
    const results = await find({ column, value, sheet, match, sheetUrl });
    return c.json({ results, time });
  } catch (e) {
    console.log('[find]', e)
  }
});

app.post('/find', async (c) => {
  try {
    const { column, value, sheet, match, sheetUrl } = await c.req.json();
    const location = c.req.query('location');
    const time = getCurrentTime(location);
    const results = await find({ column, value, sheet, match, sheetUrl });
    return c.json({ results, time });
  } catch (e) {
    console.log('[find]', e)
  }
});

// gets all data from all sheets
app.get('/all', async (c) => {
  try {
    // Perform all the fetches
    const sheetUrl = c.req.query('sheetUrl')
    const location = c.req.query('location');
    const time = getCurrentTime(location);
    const responses = await fetchAll({ sheetUrl, c })

    // Assign responses to data
    const data = responses

    // Return the aggregated results
    return c.json({ ...data, time })
  } catch (error) {
    // Handle errors if any of the requests fail
    return c.json({ error: `[/api] ${error.message}` }, 500)
  }
})





/* 

  Add a Log

*/

// prefer using POST endpoint as that one's more flexible
// use this for browser-sending or other quick tools
// usage: http://localhost:8337/add?Text=this is a test!
app.get('/addlog', async (c) => {
  try {
    const data = {
      settings: {
        sheetUrl: c.req.query('sheetUrl'),
        showResults: c.req.query('showResults'),
        Config: c.req.query('Config')
      },
      columns: c.req.query()
    };
    const response = await addLog(data);
    return c.json(response);
  } catch (error) {
    // Handle errors if any of the requests fail
    return c.json({ error: `[addlog.get] ${error.message}` }, 500);
  }
});


// prefer to use this one over the get endpoint since this is richer
// the get endpoint is great for adding new data from anywhere
// app.post('/addlog', async (c) => {
//   try {
//     const data = await c.req.json();
//     const items = Array.isArray(data.columns?.Data?.items) ? data.columns?.Data?.items : [data]; // If data.items is an array, use it. Otherwise, use data itself as an array
//     const config = await getConfigs({ name: _item.settings?.Type });
//     const responses = await Promise.all(items.map(async item => {
//       let _item = {
//         settings: data.settings,
//         columns: item.columns || item, // if passing in a single val, you'll have columns, otherwise only key/val if array of e.g. book titles
//       }
//       const addLogDataPromise = addLog(_item);
//       const [addLogData] = await Promise.all([addLogDataPromise, configPromise]);

//       const promises = [];
//       if (config.Sheets) {
//         let sheets = YAML.parse(config.Sheets)
//         if (sheets) {
//           for (const [key, value] of Object.entries(sheets)) {
//             if (value == "Append") {
//               promises.push(append({ payload: addLogData.addObj.payload, sheet: key, schema: config.Schema }));
//             }
//             if (value.includes("Db:")) {
//               let searchKey = value?.split(":")[1] || "Name";
//               promises.push(update({ key: searchKey, payload: addLogData.addObj.payload, sheet: key }));
//             }
//           }
//         }
//       }
//       await Promise.all(promises);

//       return addLogData;
//     }));

//     return c.json(responses);
//   } catch (error) {
//     return c.json({ error: `[addlog.post] ${error.message}` }, 500);
//   }
// });
app.post('/addlog', async (c) => {
  try {
    const data = await c.req.json();
    const items = Array.isArray(data.columns?.Data?.items) ? data.columns?.Data?.items : [data]; // If data.items is an array, use it. Otherwise, use data itself as an array
    
    // for a multiple-item add event, this will give them the same logId, based on the time of request
    let logId = sqids.encode([new Date().getTime()]);


    // get config, then separately add all items to the log
    // treat them as separate transactions
    const configPromise = getConfigs({ name: data.settings?.Type });
    const addLogDataPromises = items.map(async item => {
      let _item = {
        settings: data.settings,
        columns: item.columns || item, // if passing in a single val, you'll have columns, otherwise only key/val if array of e.g. book titles
      } 
      return addLog(_item, logId);
    })
    const [config, ...addLogData] = await Promise.all([configPromise, ...addLogDataPromises]);

    // console.log('CONFIG:', config, 'addLogData::', addLogData);

    let responses
    responses = {config, addLogData}

    // now we add each logged item to their own sheets
    const sheetsPromise = await Promise.all(addLogData.map(async item => {
      const promises = [];
    
      if (config.Sheets) {
        let sheets = YAML.parse(config.Sheets)
        if (sheets) {
          for (const [key, value] of Object.entries(sheets)) {
            if (value == "Append") {
              promises.push(append({ payload: item.addObj.payload, sheet: key, schema: config.Schema }));
            }
            if (value.includes("Db:")) {
              let searchKey = value?.split(":")[1] || "Name";
              promises.push(update({ key: searchKey, payload: item.addObj.payload, sheet: key }));
            }
          }
        }
      }
      return promises
    }));

    await Promise.all(sheetsPromise.flat());
    return c.json(responses);
  } catch (error) {
    return c.json({ error: `[addlog.post] ${error.message}` }, 500);
  }
});



// this is for testing; don't call it directly via LLMs or add it to the yaml
// instead, update w/ the addlog and configs
app.post('/update', async (c) => {
  try {
    const data = await c.req.json();
    let result = await update(data)
    
    return c.json(result);
  } catch (e) {
    console.log('[update] error:', e)
    return c.json({ error: `[update] ${e.message}` }, 500);
  }
});







export const addCol = async ({ columnName, sheet = 'Logs', sheetUrl = SHEET_URL }) => {

  let data;
  await semaAdd.acquire();
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "method": "ADD_COLUMN",
        "sheet": sheet,
        columnName,
      })
    })
    data = await response.json()
  } finally {
    semaAdd.release();
  }
  return data
}
export const editCol = async ({ oldColumnName, newColumnName, sheet = 'Logs', sheetUrl = SHEET_URL }) => {

  let data;
  await semaAdd.acquire();
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "method": "EDIT_COLUMN",
        "sheet": sheet,
        oldColumnName,
        newColumnName
      })
    })
    data = await response.json()
  } finally {
    semaAdd.release();
  }
  return data
}

export const removeCol = async ({ columnName, sheet = 'Logs', sheetUrl = SHEET_URL }) => {

  let data;
  await semaAdd.acquire();
  try {
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "method": "REMOVE_COLUMN",
        "sheet": sheet,
        columnName,
      })
    })
    data = await response.json()
  } finally {
    semaAdd.release();
  }
  return data
}

// this is for testing; don't call it directly via LLMs or add it to the yaml
// instead, update w/ the addlog and configs
app.post('/col/add', async (c) => {
  try {
    const data = await c.req.json();
    let result = await addCol(data)

    return c.json(result);
  } catch (e) {
    console.log('[col/add] error:', e)
    return c.json({ error: `[col/add] ${e.message}` }, 500);
  }
});
app.post('/col/edit', async (c) => {
  try {
    const data = await c.req.json();
    let result = await editCol(data)

    return c.json(result);
  } catch (e) {
    console.log('[col/edit] error:', e)
    return c.json({ error: `[col/edit] ${e.message}` }, 500);
  }
});
app.post('/col/remove', async (c) => {
  try {
    const data = await c.req.json();
    let result = await removeCol(data)

    return c.json(result);
  } catch (e) {
    console.log('[col/remove] error:', e)
    return c.json({ error: `[col/remove] ${e.message}` }, 500);
  }
});







export default app