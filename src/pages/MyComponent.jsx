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
  ButtonGroup,
  Button,
  Tooltip,
  Link,
  Chip,
  TextField,
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import {
  Add,
  DirectionsRun,
  FolderOpen,
  Info,
  Save,
  Visibility,
} from "@mui/icons-material";
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
  submitJobWithParms,
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
  getJobParms,
} from "../utility";
import localJobs from "../localJobs.json";
import { v4 as uuidv4 } from "uuid";

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
    // localJobs.map((row, index) => ({ id: uuidv4(), ...row })
    [webDavPrefix, setWebDavPrefix] = useState(null),
    [fileDownloadPrefix, setFileDownloadPrefix] = useState(null),
    [fileViewer, setFileViewer] = useState(null),
    [logViewer, setLogViewer] = useState(null),
    [status, setStatus] = useState(null),
    [openInfo, setOpenInfo] = useState(false),
    [repo, setRepo] = useState("repository"),
    [saveStatus, setSaveStatus] = useState(null),
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
        editable: false,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return <Tooltip title={params.value}>{text}</Tooltip>;
        },
      },
      { field: "parms", headerName: "Parms", width: 200, editable: true },
      { field: "status", headerName: "Status", width: 200, editable: false },
      {
        field: "submissionId",
        headerName: "Submission ID",
        width: 200,
        editable: false,
      },
      {
        field: "manifest",
        headerName: "Manifest",
        width: 200,
        editable: false,
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
        editable: false,
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
        editable: false,
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
        editable: false,
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
        editable: false,
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
    pathRef = useRef(),
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
    getParms = async (newRows, useRepo = "repository") => {
      console.log(
        "getParms - newRows: ",
        newRows,
        "repo",
        repo,
        "useRepo",
        useRepo
      );
      if (!newRows || newRows.length === 0) return newRows;
      await newRows.forEach(async (r) => {
        // if (!r.parms) {
        const response = await getJobParms(api, token, r.path, useRepo);
        console.log("getJobParms - response: ", response);
        // put parms into the row
        r.parms = JSON.stringify(response);
        setRows((prev) => [...newRows]); // try to see if this will make updates happen
        // }
      });
      // setRows((prev) => [...newRows]); // try to see if this will make updates happen
      return newRows;
    },
    handleSave = async () => {
      const selectedRows = tableRef.current.getSelectedRows(),
        rowsToSave = [...selectedRows].map(([type, value]) => ({
          path: value.path,
          parms: value.parms,
        })),
        pathToJson = pathRef.current.value;
      console.log(
        "handleSave - pathToJson: ",
        pathToJson,
        "selectedRows",
        selectedRows,
        "rowsToSave: ",
        rowsToSave
      );
      if (pathToJson.length === 0) {
        setSaveStatus("Please specify a path to JSON file to save to");
        setTimeout(() => {
          setSaveStatus(null);
        }, 10000);
        return;
      }
      const response = await upload(
        api,
        pathToJson,
        rowsToSave,
        token,
        true,
        "uploaded using upload REST API",
        "MINOR",
        repo
      );
      setSaveStatus(response);
      console.log("response from handleSave: ", response);
      setTimeout(() => {
        setSaveStatus(null);
      }, 10000);
    },
    getJobs = async () => {
      const response = await getChildren(api, token, path, setStatus, repo),
        newRows = response.items
          .filter((i) => i?.path.endsWith(".job"))
          .map((i, id) => ({ id: uuidv4(), path: i?.path }));
      console.log("jobs found from getChildren: ", response, newRows, status);
      setRows(newRows);
      const rows2 = await getParms(newRows, repo);
      setTimeout(() => {
        console.log("getJobs - rows2", rows2);
        setRows((prev) => [...rows2]);
      }, 3000);
    },
    addJobs = async () => {
      const response = await getChildren(api, token, path, setStatus, repo),
        newRows = response.items
          .filter((i) => i?.path.endsWith(".job"))
          .map((i, id) => ({ id: uuidv4(), path: i?.path }));
      console.log("jobs found from getChildren: ", response, newRows, status);
      const rows2 = await getParms(newRows, repo);
      setTimeout(() => {
        setRows((oldRows) => {
          const _newRows = oldRows
            .concat(newRows)
            .map((i) => ({ ...i, id: uuidv4() }));
          console.log("oldRows", oldRows, "_newRows", _newRows, "rows2", rows2);
          return _newRows;
        });
      }, 3000);
    },
    getJobFile = async () => {
      const response = await fetch(webDavPrefix + jobs),
        _newRows = await response.json();
      console.log("_newRows", _newRows);
      const newRows = _newRows
        .filter((i) => i?.path.endsWith(".job"))
        .map((i, id) => ({ id: uuidv4(), path: i?.path }));
      setStatus(response.status);
      console.log("getJobFile - fetch: ", response);
      setRows(newRows);
      const rows2 = await getParms(newRows, repo);
      setTimeout(() => {
        console.log("getJobFile - rows2", rows2);
        setRows((prev) => [...rows2]);
      }, 3000);
    },
    addJobFile = async () => {
      const response = await fetch(webDavPrefix + jobs),
        _newRows = await response.json();
      console.log("_newRows", _newRows);
      const newRows = _newRows
        .filter((i) => i?.path.endsWith(".job"))
        .map((i, id) => ({ id: uuidv4(), path: i?.path }));
      setStatus(response.status);
      console.log("addJobFile - fetch: ", response);
      const rows2 = await getParms(newRows, repo);
      setTimeout(() => {
        setRows((oldRows) => {
          const _newRows = oldRows
            .concat(rows2)
            .map((i, id) => ({ ...i, id: uuidv4() }));
          console.log("addJobFile - newRows", _newRows);
          return _newRows;
        });
      }, 3000);
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
              "/general/biostat/apps/encrypt/index.html?app=jobrunner"
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
        _webDavPrefix +
        `/general/biostat/apps/fileviewer/index.html?file=https://${_realhost}/lsaf/webdav/${
          repo === "repository" ? "repo" : "work"
        }`,
      _logViewer =
        _webDavPrefix +
        `/general/biostat/apps/logviewer/index.html?log=https://${_realhost}/lsaf/webdav/${
          repo === "repository" ? "repo" : "work"
        }`;
    //  `${fileDownloadPrefix}/general/biostat/apps/logviewer/index.html?log=`;
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
    console.log(
      "_api",
      _api,
      "window",
      window,
      "_fileDownloadPrefix",
      _fileDownloadPrefix,
      "_webDavPrefix",
      _webDavPrefix
    );
  }, [onClient, repo]);

  // useEffect(() => {
  //   const { host: _host } = window.location;
  //   let _realhost;
  //   if (_host.includes("sharepoint")) {
  //     _realhost = "xarprod.ondemand.sas.com";
  //   } else if (_host.includes("localhost")) {
  //     _realhost = "xartest.ondemand.sas.com";
  //   } else {
  //     _realhost = _host;
  //   }

  //   let _lsaf = "https://" + realhost + "/lsaf",
  //     _webDavPrefix = _lsaf + "/webdav/repo",
  //     _fileDownloadPrefix = _lsaf + "/filedownload/sdd:",
  //     _fileViewer =
  //       _webDavPrefix +
  //       `/general/biostat/apps/fileviewer/index.html?file=https://${_realhost}/lsaf/webdav/${
  //         repo === "repository" ? "repo" : "work"
  //       }`,
  //     _logViewer = `${_webDavPrefix}/general/biostat/apps/logviewer/index.html?log=https://${realhost}/lsaf/webdav/${
  //       repo === "repository" ? "repo" : "work"
  //     }`;
  //   setFileDownloadPrefix(_fileDownloadPrefix);
  //   setWebDavPrefix(_webDavPrefix);
  //   setFileViewer(_fileViewer);
  //   setLogViewer(_logViewer);
  //   console.log(
  //     "_webDavPrefix",
  //     _webDavPrefix,
  //     "_fileDownloadPrefix",
  //     _fileDownloadPrefix,
  //     "fileViewer",
  //     _fileViewer,
  //     "logViewer",
  //     _logViewer
  //   );
  // }, [repo]);

  // run the jobs
  useEffect(() => {
    if (!start) return;
    console.log("Run jobs", rows);
    let complete = 0;
    document.title = `0/${rows.length} jobs run`;
    const runJobs = async () => {
      for (const row of rows) {
        console.log("Run job", "row.path", row.path, "row.parms", row.parms);
        const subResp = await submitJobWithParms(
          api,
          row.path,
          token,
          row.parms,
          repo
        );
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
          maxWaitSecs,
          repo
        );
        complete = complete + 1;
        document.title = `${complete}/${rows.length} jobs run`;
        console.log("response from waitTillJobCompletes: ", checkResponse);
        row.status = checkResponse.status;
        setRows((prev) => [...rows]);
        const manifestPath = await getPathManifest(api, submissionId, token);
        console.log("response from getPathManifest: ", manifestPath);
        row.manifest = manifestPath;
        const manifestResponse = await getManifest(
          api,
          token,
          manifestPath,
          repo
        );
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
            <IconButton
              sx={{
                ml: 3,
                width: "100",
                border: 1,
                borderRadius: 2,
                borderColor: "black",
              }}
              onClick={handleRunJobs}
              size="small"
              variant="contained"
              color="success"
            >
              <DirectionsRun />
            </IconButton>
          </Tooltip>
          <Tooltip title="Save the list of selected jobs (with parms) into the JSON file specified below">
            <IconButton
              // disabled
              sx={{
                ml: 1,
                width: "100",
                border: 1,
                borderRadius: 2,
                borderColor: "black",
              }}
              onClick={handleSave}
              size="small"
              variant="contained"
              color="error"
            >
              <Save />
            </IconButton>
          </Tooltip>

          {saveStatus !== null ? (
            <Chip
              label={`${saveStatus}`}
              color={saveStatus === "SUCCESS" ? "success" : "error"}
              variant="filled"
              sx={{ ml: 2 }}
            />
          ) : null}

          {status !== null && status !== 200 ? (
            <Chip
              label={`Can't load path, status=${status}`}
              color="error"
              variant="filled"
              sx={{ ml: 2 }}
            />
          ) : null}
          <ButtonGroup sx={{ mt: 1, ml: 2 }} variant="outlined">
            <Button
              color={repo === "repository" ? "success" : "warning"}
              variant={repo === "repository" ? "contained" : "outlined"}
              size={"small"}
              onClick={async () => {
                setRepo("repository");
                const _rows = await getParms(rows, "repository");
                setRows(() => _rows);
              }}
            >
              Repository
            </Button>
            <Button
              color={repo === "workspace" ? "success" : "warning"}
              variant={repo === "workspace" ? "contained" : "outlined"}
              size={"small"}
              onClick={async () => {
                setRepo("workspace");
                const _rows = await getParms(rows, "workspace");
                console.log("rows", _rows);
                setRows(() => _rows);
              }}
            >
              Workspace
            </Button>
          </ButtonGroup>
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
          sx={{ mt: 1, mr: 1, width: (innerWidth - 140) / 2 - 150 }}
        />
        <Tooltip title="Load jobs from an LSAF folder">
          <IconButton
            onClick={() => getJobs()}
            size="small"
            sx={{
              mt: 2,
              mr: 1,
              border: 1,
              borderRadius: 2,
              borderColor: "black",
            }}
            color="primary"
            variant="contained"
          >
            <FolderOpen />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add jobs from an LSAF folder">
          <IconButton
            onClick={() => addJobs()}
            size="small"
            sx={{
              mt: 2,
              mr: 2,
              border: 1,
              borderRadius: 2,
              borderColor: "black",
            }}
            color="warning"
            variant="contained"
          >
            <Add />
          </IconButton>
        </Tooltip>
        <TextField
          inputRef={pathRef}
          label="Path to JSON file containing jobs"
          variant="outlined"
          value={jobs || ""}
          // shrink={true}
          onChange={(event) => {
            setJobs(event.target.value);
          }}
          size="small"
          sx={{ mt: 1, mr: 1, width: (innerWidth - 140) / 2 - 150 }}
        />
        <Tooltip title="Load list of jobs from a file">
          <IconButton
            onClick={() => getJobFile()}
            size="small"
            sx={{
              mt: 2,
              mr: 1,
              border: 1,
              borderRadius: 2,
              borderColor: "black",
            }}
            color="primary"
            variant="contained"
          >
            <FolderOpen />
          </IconButton>
        </Tooltip>
        <Tooltip title="Add list of jobs from a file">
          <IconButton
            onClick={() => addJobFile()}
            size="small"
            sx={{
              mt: 2,
              mr: 1,
              border: 1,
              borderRadius: 2,
              borderColor: "black",
            }}
            color="warning"
            variant="contained"
          >
            <Add />
          </IconButton>
        </Tooltip>
        <Tooltip title="View the JSON file">
          <IconButton
            onClick={() =>
              window.open(fileViewer + pathRef.current.value, "_blank")
            }
            size="small"
            sx={{
              mt: 2,
              mr: 1,
              border: 1,
              borderRadius: 2,
              borderColor: "black",
            }}
            color="secondary"
            variant="contained"
          >
            <Visibility />
          </IconButton>
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
          // disableSelectionOnClick
          // disableRowSelectionOnClick
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
          <Box sx={{ fontSize: 13 }}>
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
            <p />
            You can use the RESTAPI app to run a job. You can even pass a
            parameter to automatically submit it, although by default you will
            need to press the Submit button. Try it here:{" "}
            <Link
              href="https://xarprod.ondemand.sas.com:8000/lsaf/filedownload/sdd%3A/general/biostat/apps/restapi2/index.html?job=/general/biostat/jobs/utils/dev/jobs/folder_access_request.job&_extra=123&_name=phil"
              target="_blank"
              rel="noreferrer"
              color="primary"
              underline="always"
            >
              RESTAPI
            </Link>
            <p />
            Click here for{" "}
            <b>
              <Link
                href="https://xarprod.ondemand.sas.com:8000/lsaf/filedownload/sdd%3A///general/biostat/apps/logviewer/bookmarklet.html"
                target="_blank"
                rel="noreferrer"
                color="primary"
                underline="always"
              >
                Bookmarklets
              </Link>
            </b>
          </Box>
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
}
