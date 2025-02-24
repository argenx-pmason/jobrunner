"use client";

import { useEffect, useState, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  Tooltip,
  Link,
  TextField,
} from "@mui/material";
import { DataGridPro } from "@mui/x-data-grid-pro";
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
    [rows, setRows] = useState(
      localJobs.map((row, index) => ({ id: index, ...row }))
    ),
    [webDavPrefix, setWebDavPrefix] = useState(null),
    [fileDownloadPrefix, setFileDownloadPrefix] = useState(null),
    [fileViewer, setFileViewer] = useState(null),
    [logViewer, setLogViewer] = useState(null),
    cols = [
      {
        field: "path",
        headerName: "Path",
        width: 500,
        renderCell: (params) => {
          if (!params.value || !params.value.includes("/")) return null;
          const text = params.value.split("/").pop();
          return text;
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
        width: 200,
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
    const getJobs = async () => {
      const response = await getChildren(api, token, path),
        newRows = response.items
          .filter((i) => i?.path.endsWith(".job"))
          .map((i, id) => ({ id: id, path: i?.path }));
      console.log("jobs found from getChildren: ", response, newRows);
      setRows(newRows);
    };
    if (token) getJobs();
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
      _path = queryParameters.get("path"),
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
    <>
      <AppBar position="fixed">
        <Toolbar variant="dense" sx={{ backgroundColor: "#f7f7f7" }}>
          <Box
            sx={{
              border: 1,
              borderRadius: 2,
              color: "black",
              fontWeight: "bold",
              boxShadow: 3,
              fontSize: 14,
              height: 23,
              padding: 0.3,
            }}
          >
            &nbsp;Run job(s) from {path}&nbsp;
          </Box>
          <Tooltip
            title="How often should we check the progress of the job"
            arrow
          >
            <TextField
              label="Check progress (secs)"
              variant="outlined"
              value={checkEvery}
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
              value={maxWaitSecs}
              size="small"
              onChange={(event) => {
                setMaxWaitSecs(event.target.value);
              }}
              sx={{ mt: 1, mb: 1, ml: 3 }}
            />
          </Tooltip>
          <Button
            sx={{ ml: 3, width: "100" }}
            onClick={handleRunJobs}
            size="small"
            variant="contained"
          >
            Run
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ height: 30 }}></Box>
      <Box sx={{ height: innerHeight - 60, width: innerWidth - 200 }}>
        <DataGridPro
          apiRef={tableRef}
          // autoPageSize={true}
          getRowHeight={() => 35}
          rows={rows}
          columns={cols}
          checkboxSelection
          disableSelectionOnClick
          disableRowSelectionOnClick
          rowReordering
          onRowOrderChange={handleRowOrderChange}
        />
      </Box>
    </>
  );
}
