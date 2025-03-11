"use client";

import { useEffect, useState, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Button,
  Tooltip,
  Link,
  Chip,
  TextField,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Info } from "@mui/icons-material";
import {
  DataGridPro,
  GridToolbar,
  GRID_REORDER_COL_DEF,
  GRID_CHECKBOX_SELECTION_COL_DEF,
} from "@mui/x-data-grid-pro";
import { LicenseInfo } from "@mui/x-license";
import {
  encryptPassword,
  logon,
  submitJob,
  upload,
  waitTillJobCompletes,
  getPathManifest,
  getManifest,
  getFileContents,
  getFileVersions,
  getChildren,
  checkout,
  checkin,
  undocheckout,
} from "../utility";
import localJobs from "../localJobs.json";

export default function MyComponent() {
  LicenseInfo.setLicenseKey(
    "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
  );
  const [onClient, setOnClient] = useState(false),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [token, setToken] = useState(undefined),
    [encryptedPassword, setEncryptedPassword] = useState(""),
    [message, setMessage] = useState(null),
    [openSnackbar, setOpenSnackbar] = useState(false),
    [rows, setRows] = useState([]),
    // localJobs.map((row, index) => ({ id: index, ...row })
    [webDavPrefix, setWebDavPrefix] = useState(null),
    [fileDownloadPrefix, setFileDownloadPrefix] = useState(null),
    [fileViewer, setFileViewer] = useState(null),
    [logViewer, setLogViewer] = useState(null),
    [status, setStatus] = useState(null),
    [openInfo, setOpenInfo] = useState(false),
    lightTheme = createTheme({
      palette: {
        mode: "light",
      },
    }),
    cols = [
      {
        field: "path",
        headerName: "Path",
        width: 500,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return <Tooltip title={params.value}>{text}</Tooltip>;
        },
      },
      { field: "status", headerName: "Status", width: 200 },
      { field: "submissionId", headerName: "Submission ID", width: 200 },
      {
        field: "manifest",
        headerName: "Manifest",
        width: 200,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return (
            <Link
              href={fileViewer + params.value}
              target="_blank"
              rel="noreferrer"
            >
              {text}
            </Link>
          );
        },
      },
      {
        field: "log",
        headerName: "Log",
        width: 200,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return (
            <Link
              href={logViewer + params.value}
              target="_blank"
              rel="noreferrer"
            >
              {text}
            </Link>
          );
        },
      },
      {
        field: "lst",
        headerName: "List",
        width: 200,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return (
            <Link
              href={fileViewer + params.value}
              target="_blank"
              rel="noreferrer"
            >
              {text}
            </Link>
          );
        },
      },
      {
        field: "program",
        headerName: "Program(s)",
        width: 200,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return (
            <Link
              href={fileViewer + params.value}
              target="_blank"
              rel="noreferrer"
            >
              {text}
            </Link>
          );
        },
      },
      {
        field: "output",
        headerName: "Output",
        width: 1200,
        renderCell: (params) => {
          if (!params.value) return null;
          const links = params.value.map((o, id) => {
            const text = o.split("/").pop();
            return (
              <Link
                key={"link" + id}
                sx={{ mr: 1 }}
                href={fileViewer + o}
                target="_blank"
                rel="noreferrer"
              >
                {text}
              </Link>
            );
          });
          return links;
        },
      },
    ],
    handleCloseSnackbar = (event, reason) => {
      if (reason === "clickaway") {
        return;
      }
      setOpenSnackbar(false);
    },
    [host, setHost] = useState(""),
    [href, setHref] = useState(""),
    [mode, setMode] = useState(""),
    [innerWidth, setInnerWidth] = useState(0),
    [innerHeight, setInnerHeight] = useState(0),
    [realhost, setRealhost] = useState(""),
    [api, setApi] = useState(undefined),
    [lsafType, setLsafType] = useState(""),
    [path, setPath] = useState(null),
    [jobs, setJobs] = useState(null),
    [start, setStart] = useState(false),
    handleRunJobs = () => {
      const selectedRows = tableRef.current.getSelectedRows(),
        runningRows = [];
      console.log("Run jobs", tableRef, selectedRows);
      selectedRows.forEach((row) => {
        console.log("Run job", row.path);
        runningRows.push(row);
      });
      setRows(runningRows.map((r) => ({ ...r, status: "Ready" })));
      setStart(true);
    },
    tableRef = useRef(),
    [checkEvery, setCheckEvery] = useState(5),
    [maxWaitSecs, setMaxWaitSecs] = useState(600),
    updateRowPosition = (initialIndex, newIndex, rows) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const rowsClone = [...rows];
          const row = rowsClone.splice(initialIndex, 1)[0];
          rowsClone.splice(newIndex, 0, row);
          resolve(rowsClone);
        }, Math.random() * 500 + 100); // simulate network latency
      });
    },
    handleRowOrderChange = async (params) => {
      const newRows = await updateRowPosition(
        params.oldIndex,
        params.targetIndex,
        rows
      );
      setRows(newRows);
    },
    getJobs = async () => {
      const response = await getChildren(api, token, path, setStatus),
        newRows = response.items
          .filter((i) => i?.path.endsWith(".job"))
          .map((i, id) => ({ id: id, path: i?.path }));
      console.log("jobs found from getChildren: ", response, newRows, status);
      setRows(newRows);
    },
    addJobs = async () => {
      const response = await getChildren(api, token, path, setStatus),
        newRows = response.items
          .filter((i) => i?.path.endsWith(".job"))
          .map((i, id) => ({ id: id, path: i?.path }));
      console.log("jobs found from getChildren: ", response, newRows, status);
      setRows((oldRows) => {
        const _newRows = oldRows
          .concat(newRows)
          .map((i, id) => ({ ...i, id: id }));
        console.log("newRows", _newRows);
        return _newRows;
      });
    },
    getJobFile = async () => {
      const response = await fetch(webDavPrefix + jobs),
        _newRows = await response.json();
      console.log("_newRows", _newRows);
      const newRows = _newRows
        .filter((i) => i?.path.endsWith(".job"))
        .map((i, id) => ({ id: id, path: i?.path }));
      setStatus(response.status);
      console.log("getJobFile - fetch: ", response);
      setRows(newRows);
    },
    addJobFile = async () => {
      const response = await fetch(webDavPrefix + jobs),
        _newRows = await response.json();
      console.log("_newRows", _newRows);
      const newRows = _newRows
        .filter((i) => i?.path.endsWith(".job"))
        .map((i, id) => ({ id: id, path: i?.path }));
      setStatus(response.status);
      console.log("addJobFile - fetch: ", response);
      setRows((oldRows) => {
        const _newRows = oldRows
          .concat(newRows)
          .map((i, id) => ({ ...i, id: id }));
        console.log("newRows", _newRows);
        return _newRows;
      });
    };

  useEffect(() => {
    setOnClient(true);
    const tempUsername = localStorage.getItem("username"),
      tempEncryptedPassword = localStorage.getItem("encryptedPassword");
    setUsername(tempUsername);
    setEncryptedPassword(tempEncryptedPassword);
  }, []);

  useEffect(() => {
    if (mode === "local") return;
    if (api === null || api === undefined) return;
    // logon if we have the info needed to do it successfully
    // if it fails, then token is set to null which will trigger opening encrypt app
    logon(api, username, encryptedPassword, setToken);
  }, [api]);

  // if encrypting password failed, then open the encrypt app before continuing
  useEffect(() => {
    if (mode === "local") return;
    // default value for token is undefined, if logon is attempted and fails then it is set to null
    if (token === null) {
      setMessage(
        "😲 Logon failed - please re-enter your username & password and then return to this page to refresh it. 👍"
      );
      setOpenSnackbar(true);
      setTimeout(() => {
        window
          .open(
            "https://" +
              host +
              "/lsaf/webdav/" +
              lsafType +
              "/general/biostat/apps/encrypt/index.html"
          )
          .focus();
      }, 3000);
    }

    if (token && path) getJobs();
    else if (token && jobs) getJobFile();
  }, [token]);

  // can only access window object on client side
  useEffect(() => {
    console.log("onClient", onClient);
    const { host: _host, href: _href } = window.location,
      _mode = href.startsWith("http://localhost") ? "local" : "remote";
    let _realhost;
    if (_host.includes("sharepoint")) {
      _realhost = "xarprod.ondemand.sas.com";
    } else if (_host.includes("localhost")) {
      _realhost = "xartest.ondemand.sas.com";
    } else {
      _realhost = _host;
    }
    const _api = "https://" + _realhost + "/lsaf/api",
      _lsaf = "https://" + _realhost + "/lsaf",
      _lsafType =
        _href.includes("/webdav/work") || _href.includes("/filedownload/work")
          ? "work"
          : "repo",
      queryParameters = new URLSearchParams(window.location.search),
      _path = queryParameters.get("path") ? queryParameters.get("path") : null,
      _checkEvery = queryParameters.get("checkevery")
        ? queryParameters.get("checkevery")
        : 5,
      _maxWaitSecs = queryParameters.get("maxwaitsecs")
        ? queryParameters.get("maxwaitsecs")
        : 600,
      _jobs = queryParameters.get("jobs") ? queryParameters.get("jobs") : null,
      _webDavPrefix = _lsaf + "/webdav/repo",
      _fileDownloadPrefix = _lsaf + "/filedownload/sdd:",
      _fileViewer =
        _webDavPrefix + "/general/biostat/apps/fileviewer/index.html?file=",
      _logViewer = `${fileDownloadPrefix}/general/biostat/apps/logviewer/index.html?log=`;
    setWebDavPrefix(_webDavPrefix);
    setFileDownloadPrefix(_fileDownloadPrefix);
    setFileViewer(_fileViewer);
    setLogViewer(_logViewer);
    setHost(_host);
    setHref(_href);
    setMode(_mode);
    setRealhost(_realhost);
    setApi(_api);
    setLsafType(_lsafType);
    setInnerHeight(window.innerHeight);
    setInnerWidth(window.innerWidth);
    setPath(_path);
    setJobs(_jobs);
    setCheckEvery(_checkEvery);
    setMaxWaitSecs(_maxWaitSecs);
    console.log("_api", _api, "window", window);
  }, [onClient]);

  // run the jobs
  useEffect(() => {
    if (!start) return;
    console.log("Run jobs", rows);
    const runJobs = async () => {
      for (const row of rows) {
        console.log("Run job", row.path);
        const subResp = await submitJob(api, row.path, token);
        console.log("response from submitJob: ", subResp);
        const { submissionId } = subResp;
        row.submissionId = submissionId;
        row.status = subResp.status;
        setRows((prev) => [...rows]);
        const checkResponse = await waitTillJobCompletes(
          api,
          submissionId,
          token,
          checkEvery,
          maxWaitSecs
        );
        console.log("response from waitTillJobCompletes: ", checkResponse);
        row.status = checkResponse.status;
        setRows((prev) => [...rows]);
        const manifestPath = await getPathManifest(api, submissionId, token);
        console.log("response from getPathManifest: ", manifestPath);
        row.manifest = manifestPath;
        const manifestResponse = await getManifest(api, token, manifestPath);
        console.log("response from getManifest: ", manifestResponse);
        row.log = manifestResponse.log_path;
        row.lst = manifestResponse.repository_path;
        row.program = manifestResponse.prog_path;
        row.output = manifestResponse.output_files;
        setRows((prev) => [...rows]);
      }
    };
    runJobs();
  }, [start]);

  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <AppBar sx={{ mb: 10 }} position="fixed">
        <Toolbar variant="dense" sx={{ backgroundColor: "#f7f7f7" }}>
          <Box
            sx={{
              border: 1,
              borderRadius: 2,
              color: "black",
              fontWeight: "bold",
              boxShadow: 3,
              fontSize: 14,
              height: 25,
              padding: 0.2,
            }}
          >
            &nbsp;Run job(s)&nbsp;
          </Box>
          <Tooltip
            title="How often should we check the progress of the job"
            arrow
          >
            <TextField
              label="Check progress (secs)"
              variant="outlined"
              value={checkEvery || ""}
              size="small"
              onChange={(event) => {
                setCheckEvery(event.target.value);
              }}
              sx={{ mt: 1, mb: 1, ml: 3 }}
            />
          </Tooltip>
          <Tooltip
            title="How long should we wait for the job to complete, before we move on to the next one?"
            arrow
          >
            <TextField
              label="Max wait"
              variant="outlined"
              value={maxWaitSecs || ""}
              size="small"
              onChange={(event) => {
                setMaxWaitSecs(event.target.value);
              }}
              sx={{ mt: 1, mb: 1, ml: 3 }}
            />
          </Tooltip>
          <Tooltip title="Run the selected jobs">
            <Button
              sx={{ ml: 3, width: "100" }}
              onClick={handleRunJobs}
              size="small"
              variant="contained"
            >
              Run
            </Button>
          </Tooltip>
          <Tooltip title="Save the list of jobs">
            <Button
              disabled
              sx={{ ml: 1, width: "100" }}
              // onClick={handleRunJobs}
              size="small"
              variant="contained"
            >
              Save
            </Button>
          </Tooltip>

          {status !== null && status !== 200 ? (
            <Chip
              label={`Can't load path, status=${status}`}
              color="error"
              variant="filled"
              sx={{ ml: 2 }}
            />
          ) : null}
          <Box sx={{ flexGrow: 1 }}></Box>
          <Tooltip title="Information about this screen">
            <IconButton
              color="info"
              // sx={{ mr: 2 }}
              onClick={() => {
                setOpenInfo(true);
              }}
            >
              <Info />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 60 }}>
        <TextField
          label="Path to folder containing jobs"
          variant="outlined"
          value={path || ""}
          onChange={(event) => {
            setPath(event.target.value);
          }}
          size="small"
          sx={{ mt: 1, mr: 1, width: 500 }}
        />
        <Tooltip title="Load jobs from an LSAF folder">
          <Button
            onClick={() => getJobs()}
            size="small"
            sx={{ mt: 2, mr: 1 }}
            color="secondary"
            variant="contained"
          >
            Load
          </Button>
        </Tooltip>
        <Tooltip title="Add jobs from an LSAF folder">
          <Button
            onClick={() => addJobs()}
            size="small"
            sx={{ mt: 2, mr: 2 }}
            color="warning"
            variant="contained"
          >
            Add
          </Button>
        </Tooltip>
        <TextField
          label="Path to JSON file containing jobs"
          variant="outlined"
          value={jobs || ""}
          // shrink={true}
          onChange={(event) => {
            setJobs(event.target.value);
          }}
          size="small"
          sx={{ mt: 1, mr: 1, width: 500 }}
        />
        <Tooltip title="Load list of jobs from a file">
          <Button
            onClick={() => getJobFile()}
            size="small"
            sx={{ mt: 2, mr: 1 }}
            color="success"
            variant="contained"
          >
            Load
          </Button>
        </Tooltip>
        <Tooltip title="Add list of jobs from a file">
          <Button
            onClick={() => addJobFile()}
            size="small"
            sx={{ mt: 2, mr: 2 }}
            color="warning"
            variant="contained"
          >
            Add
          </Button>
        </Tooltip>
      </Box>
      <Box sx={{ height: innerHeight - 200, width: innerWidth - 140 }}>
        <DataGridPro
          apiRef={tableRef}
          // autoPageSize={true}
          getRowHeight={() => 35}
          rows={rows}
          density="compact"
          columns={cols}
          checkboxSelection
          disableSelectionOnClick
          disableRowSelectionOnClick
          rowReordering
          onRowOrderChange={handleRowOrderChange}
          slots={{ toolbar: GridToolbar }}
          disableDensitySelector
          initialState={{
            pinnedColumns: {
              left: [
                GRID_REORDER_COL_DEF.field,
                GRID_CHECKBOX_SELECTION_COL_DEF.field,
                "path",
              ],
            },
          }}
        />
      </Box>
      {/* Dialog with General info about this screen */}
      <Dialog
        fullWidth
        maxWidth="xl"
        onClose={() => setOpenInfo(false)}
        open={openInfo}
      >
        <DialogTitle>Info about this screen</DialogTitle>
        <DialogContent>
          <Box sx={{ color: "black", fontSize: 13 }}>
            On the URL you can specify some parameters:
            <ul>
              <li>
                <b>path=</b> specifies a folder to display jobs from, e.g.
                path=/general/biostat/jobs/utils/dev/jobs
              </li>
              <li>
                <b>job=</b> specifies a JSON file that has an ordered array of
                objects with job info. Each object has the path to a job in
                LSAF, e.g. path=/general/biostat/jobs/utils/dev/jobs
              </li>
              <li>
                <b>checkevery=</b> specifies how to check the status of a
                submitted job every number of seconds
              </li>
              <li>
                <b>maxWaitSecs=</b> specifies how long to wait for a job to
                complete before moving on to the next one
              </li>
            </ul>{" "}
            <br />
            You could use this sample JSON file with jobs to be run, which is
            located on LSAF PROD at:{" "}
            <b>/general/biostat/apps/jobrunner/sample_jobs.json</b>
            {/* (view it{" "}
            <b>
              <Link
                href="https://xarprod.ondemand.sas.com:8000/lsaf/webdav/repo/general/biostat/apps/view/index.html?lsaf=/general/biostat/apps/jobrunner/sample_jobs.json"
                target="_blank"
                rel="noreferrer"
                color="blue"
                underline="always"
              >
                here
              </Link>
            </b>). */}
            <br />
            You could use a SAS program to create the JSON file with job paths,
            using a program like this:{" "}
            <b>/general/biostat/apps/jobrunner/make_a_jobs_file.sas</b>
            {/* <b>
              <Link
                href="https://xarprod.ondemand.sas.com:8000/lsaf/webdav/repo/general/biostat/apps/fileviewer/index.html?file=https://xarprod.ondemand.sas.com:8000/lsaf/webdav/repo/general/biostat/apps/jobrunner/make_a_jobs_file.sas"
                target="_blank"
                rel="noreferrer"
                color="blue"
                underline="always"
              >
                this
              </Link>
            </b> */}
            <p />
            <b>
              {" "}
              <a
                href="https://xarprod.ondemand.sas.com:8000/lsaf/filedownload/sdd%3A///general/biostat/apps/logviewer/bookmarklet.html"
                target="_blank"
                rel="noreferrer"
              >
                Bookmarklets
              </a>
            </b>
          </Box>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}
