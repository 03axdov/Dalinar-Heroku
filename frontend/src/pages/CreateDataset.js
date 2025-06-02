import React, {useState, useRef, useEffect} from "react"
import {useNavigate} from "react-router-dom"
import axios from "axios"
import ProgressBar from "../components/ProgressBar"
import TitleSetter from "../components/minor/TitleSetter"
import { useTask } from "../contexts/TaskContext"
import Select from 'react-select';
import { customStyles, customStylesNoMargin } from "../helpers/styles";

function CreateDataset({notification, BACKEND_URL, activateConfirmPopup, changeDatasetCount}) {
    const { getTaskResult } = useTask();

    const navigate = useNavigate()

    const [loading, setLoading] = useState(false)
    const [uploadingDatasetFolders, setUploadingDatasetFolders] = useState(false)
    const [uploadingDatasetFilenames, setUploadingDatasetFilenames] = useState(false)
    const [uploadingDatasetCsv, setUploadingDatasetCsv] = useState(false)
    const [uploadingPercentage, setUploadingPercentage] = useState(false)

    const [creatingElements, setCreatingElements] = useState(false)
    const [creatingElementsProgress, setCreatingElementsProgress] = useState(0)

    const [datasetType, setDatasetType] = useState("image")
    const [type, setType] = useState("classification")  // used for image datasets, either "classification" or "area"
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [image, setImage] = useState(null)
    const [visibility, setVisibility] = useState("public")
    const [keywordCurrent, setKeywordCurrent] = useState("")
    const [keywords, setKeywords] = useState([])
    const [imageWidth, setImageWidth] = useState("")
    const [imageHeight, setImageHeight] = useState("")

    const imageInputRef = useRef(null)
    const [imageURL, setImageURL] = useState("")

    const [uploadDropdownVisible, setUploadDropdownVisible] = useState(false)

    const [uploadedFoldersAsLabels, setUploadedFoldersAsLabels] = useState([])
    const [uploadedFilenamesAsLabels, setUploadedFilenamesAsLabels] = useState([])
    const [uploadedCsvs, setUploadedCsvs] = useState([])

    const [numberFiles, setNumberFiles] = useState("")
    const [uploadedDatasets, setUploadedDatasets] = useState({}) // Labels as keys, with the value as an array of files with that label
    const [uploadedFilesCount, setUploadedFilesCount] = useState(0)

    const hiddenFolderInputRef = useRef(null)
    const hiddenFilenamesInputRef = useRef(null)
    const hiddenCsvInputRef = useRef(null)
    const hiddenFilesInputRef = useRef(null) // Used for Area datasets
    const hiddenAreaInputRef = useRef(null) // Used for Area datasets

    const INVALID_LABELS = new Set(["name", "datatype", "description", "image", "visibility", "labels"]) // Would impact formData below, temporary fix

    const areaFileOptions = [
        {
            "value": "csv",
            "label": ".csv - filename, x_start, y_start, x_end, y_end, label (optional)"
        },
        {
            "value": "csv-2",
            "label": ".csv - filename, x_start, x_end, y_start, y_end, label (optional)"
        },
        {
            "value": "csv-3",
            "label": ".csv - filename, (any), (any), x_start, x_end, y_start, y_end, label (optional)"
        },
        {
            "value": "text",
            "label": "Multiple .txt files"
        },
    ]

    const textFormatOptions = [
        {
            "value": 1,
            "label": "label, x_start, y_start, x_end, y_end"
        },
        {
            "value": 2,
            "label": "x_start, y_start, x_end, y_end, label (optional)"
        },
    ]

    const [areaFileFormat, setAreaFileFormat] = useState(areaFileOptions[0]);
    const [uploadedAreaFile, setUploadedAreaFile] = useState(null)  // Will be used to generate areas
    const [uploadedAreaFiles, setUploadedAreaFiles] = useState([])  // The elements themselves
    const [uploadedAreaDelimeter, setUploadedAreaDelimeter] = useState(",")
    const [uploadedTextFilesFormat, setUploadedTextFilesFormat] = useState(textFormatOptions[0])

    useEffect(() => {
        if (image === null) return
        if (image === '') return
        if (image === undefined) return
        var binaryData = [];
        binaryData.push(image);
        const url = URL.createObjectURL(new Blob(binaryData, {type: "application/zip"}))
        setImageURL(url)
    }, [image])

    function formOnSubmit(e) {
        e.preventDefault()

        let totalSize = 0;
        let labelsCount = 0;
        Object.entries(uploadedDatasets).forEach(([label, fileList]) => {
            fileList.forEach((file) => {
                totalSize += file.size
            })
            labelsCount += 1
        })
        if (totalSize > 1 * 10**9) {
            notification("A maximum of 1 Gb can be uploaded at a time.", "failure")
            return;
        }
        if (labelsCount > 1000) {
            notification("A dataset can not have more than 1000 labels.", "failure")
            return;
        }

        if ((imageWidth && !imageHeight) || (!imageWidth && imageHeight)) {
            notification("You must specify either both image dimensions or neither.", "failure")
            return;
        }

        if (!name) {
            notification("Please enter a dataset name.", "failure")
            return;
        }

        if (!image) {
            notification("Please upload an image.", "failure")
            return;
        }

        axios.defaults.withCredentials = true;
        axios.defaults.xsrfHeaderName = 'X-CSRFTOKEN';
        axios.defaults.xsrfCookieName = 'csrftoken';    

        let formData = new FormData()

        formData.append('name', name)
        formData.append('datatype', type)
        formData.append('dataset_type', datasetType)
        formData.append('description', (description ? description : ""))
        formData.append('image', image)
        formData.append("visibility", visibility)
        if (keywords.length > 0) {
            formData.append("keywords", JSON.stringify(keywords))
        }
        
        formData.append("imageWidth", imageWidth)
        formData.append("imageHeight", imageHeight)
        
        const URL = window.location.origin + '/api/create-dataset/'
        const config = {headers: {'Content-Type': 'multipart/form-data'}}

        if (loading) {
            return;
        }

        setLoading(true)
        axios.post(URL, formData, config)
        .then((res) => {
            console.log("Success:", res.data);
            
            const callback = () => {
                if (isEmpty(uploadedDatasets) && uploadedAreaFiles.length == 0) {
                    navigate("/home");
                    notification("Successfully created dataset " + name + ".", "success");
                }
            };

            gtag('event', 'conversion', {
                send_to: 'AW-17119632058/1ErUCO-D_dEaELq1o-M_',
                value: 50.0,
                currency: 'SEK',
                event_callback: callback
            });

            // Fallback: ensure navigation even if callback doesn't fire
            setTimeout(callback, 800);
            
            changeDatasetCount(1)
            if (type == "classification" && !isEmpty(uploadedDatasets)) {
                createElements(res.data.id)
            } else if (type == "area" && uploadedAreaFiles.length > 0) {
                createAreaElements(res.data.id)
            } else {
                navigate("/home")
                notification("Successfully created dataset " + name + ".", "success")
            }
            
        }).catch((error) => {
            notification("An error occured.", "failure")
            console.log("Error: ", error)
        }).finally(() => {
            if (isEmpty(uploadedDatasets)) {
                setLoading(false)
            }
        })
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async function uploadWithRetry(url, formData, config, retries = 5, delayMs = 1000) {
        for (let i = 0; i < retries; i++) {
            try {
                await axios.post(url, formData, config);
                return;
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    let waitTime = delayMs * (i + 1);
                    const retryAfter = error.response.headers['retry-after'];
                    if (retryAfter) {
                        const parsed = parseInt(retryAfter, 10);
                        waitTime = isNaN(parsed) ? delayMs * (i + 1) : parsed * 1000;
                    }
                    console.warn(`Rate limited. Waiting ${waitTime} ms before retry... (${i + 1}/${retries})`);
                    await delay(waitTime);
                } else {
                    throw error;
                }
            }
        }
        throw new Error("Upload failed after multiple retries due to rate limits.");
    }
    
    function randomColor() {
        const min = 50; // Avoid dark colors
        const r = Math.floor(Math.random() * (256 - min) + min);
        const g = Math.floor(Math.random() * (256 - min) + min);
        const b = Math.floor(Math.random() * (256 - min) + min);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }
    
    function createElements(dataset_id) {
        setCreatingElements(true);

        // Prepare labels array with name and color
        const labelsArray = Object.entries(uploadedDatasets).map(([label]) => ({
            name: label,
            color: randomColor(),
            dataset: dataset_id
        }));

        // Payload for backend
        const payload = {
            dataset: dataset_id,
            labels: labelsArray,
        };

        const URL = window.location.origin + '/api/create-labels/';
        const config = { headers: { 'Content-Type': 'application/json' } };

        axios.post(URL, JSON.stringify(payload), config)
            .then((res) => {
                const createdLabels = res.data.created || [];
                const fileLabelPairs = [];

                // For each created label, find matching files and assign label id
                createdLabels.forEach(({ id, name }) => {
                    const files = uploadedDatasets[name] || [];
                    files.forEach(file => {
                        fileLabelPairs.push({ file, label: id });
                    });
                });

                // Call the inner element creation function with all files + label IDs
                createElementsInner(dataset_id, fileLabelPairs);
            })
            .catch((error) => {
                notification("Failed to create labels", "failure");
            });
    }
    
    function createElementsInner(dataset_id, fileLabelPairs) {
        const URL = window.location.origin + '/api/upload-elements/';
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    
        const chunks = chunkArray(fileLabelPairs, 10);
        let completed = 0;
    
        async function uploadChunk(chunk, i) {
            const formData = new FormData();
            chunk.forEach(pair => formData.append('files', pair.file));
    
            formData.append('dataset', dataset_id);
            formData.append('index', i*10)
    
            await uploadWithRetry(URL, formData, config);
        }
    
        async function uploadAllChunks() {
            const CONCURRENCY = 3;
            let current = 0;

            async function next() {
                if (current >= chunks.length) return;
                const i = current++;
                try {
                    await uploadChunk(chunks[i], i);
                } catch (e) {
                    console.error("Chunk upload failed:", e);
                    notification("Upload failed for one or more batches.", "failure");
                } finally {
                    completed++;
                    setCreatingElementsProgress((completed / (chunks.length * 4)) * 100);
                    await next(); // Start next after finishing one
                }
            }

            // Launch limited number of concurrent uploads
            await Promise.all(Array(CONCURRENCY).fill(0).map(next));

            let resInterval = null;
            let errorOccured = false;
            axios.post("/api/finalize-elements-upload/", {
                dataset: dataset_id,
                start_index: 0,
                labels: fileLabelPairs.map(p => p.label),
            }).then((res) => {
                resInterval = setInterval(() => getTaskResult(
                    "deleting_dataset",
                    resInterval,
                    res.data["task_id"],
                    () => {
                    },
                    (data) => {
                        notification("Creating elements failed: " + data["message"], "failure")
                        errorOccured = true;
                    },
                    (data) => {
                        setCreatingElementsProgress(25 + (data["creating_elements_progress"] * 0.75) * 100)
                    },
                    () => {
                        setCreatingElementsProgress(100);
                        setTimeout(() => {
                            navigate("/home");
                            if (!errorOccured) {
                                notification("Successfully created dataset " + name + ".", "success");
                            }
                            
                            if (document.visibilityState !== "visible") {
                                alert("Dataset creation finished.")
                            }
                        }, 200);
                    }
                ), 3000)    // ping every 3 seconds
            });
        }

    
        uploadAllChunks();
    }

    function processCsvFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.trim().split('\n');
                const [headerLine, ...dataLines] = lines;

                const rectanglesByFilename = {};

                dataLines.forEach((line) => {
                let filename, xStart, xEnd, yStart, yEnd, label = "default";

                const parts = line.split(',');

                if (areaFileFormat.value === "csv") {
                    [filename, xStart, yStart, xEnd, yEnd] = parts;
                    if (parts.length >= 6) {
                        label = parts[5].trim();
                    }
                } else if (areaFileFormat.value === "csv-2") {
                    [filename, xStart, xEnd, yStart, yEnd] = parts;
                    if (parts.length >= 6) {
                        label = parts[5].trim();
                    }
                } else if (areaFileFormat.value === "csv-3") {
                    let any1, any2;
                    [filename, any1, any2, xStart, xEnd, yStart, yEnd] = parts;
                    if (parts.length >= 6) {
                        label = parts[5].trim();
                    }
                } else {
                    throw new Error(`Unsupported format: ${areaFileFormat}`);
                }

                const rectangle = [
                    [parseFloat(xStart), parseFloat(yStart)],
                    [parseFloat(xEnd), parseFloat(yStart)],
                    [parseFloat(xEnd), parseFloat(yEnd)],
                    [parseFloat(xStart), parseFloat(yEnd)],
                ];

                if (!rectanglesByFilename[filename]) {
                    rectanglesByFilename[filename] = {};
                }

                if (!rectanglesByFilename[filename][label]) {
                    rectanglesByFilename[filename][label] = [];
                }

                rectanglesByFilename[filename][label].push(rectangle);
                });

                resolve(rectanglesByFilename);
            } catch (error) {
                reject(error);
            }
            };

            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    function processUploadedAreaFiles() {
        const rectanglesByFilename = {};

        const filePromises = uploadedAreaFiles.map(file => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    try {
                        const text = e.target.result.trim();
                        const lines = text.split('\n');

                        const filename = file.name.replace(/\.[^/.]+$/, ""); // remove extension

                        if (!rectanglesByFilename[filename]) {
                            rectanglesByFilename[filename] = {};
                        }

                        lines.forEach(line => {
                            const parts = line.split(uploadedAreaDelimeter).map(s => s.trim());
                            if (parts.length < 4) return; // skip invalid

                            let xStart, yStart, xEnd, yEnd;
                            let label = "default";
                            if (uploadedTextFilesFormat.value == 1) {
                                [label, xStart, yStart, xEnd, yEnd] = parts;
                            } else if (uploadedTextFilesFormat.value == 2) {
                                [xStart, yStart, xEnd, yEnd] = parts;
                                label = parts[4] || "default";
                            } else {
                                console.log("Unknown format.")
                                return
                            }
                            

                            const rectangle = [
                                [parseFloat(xStart), parseFloat(yStart)],
                                [parseFloat(xEnd), parseFloat(yStart)],
                                [parseFloat(xEnd), parseFloat(yEnd)],
                                [parseFloat(xStart), parseFloat(yEnd)],
                            ];

                            if (!rectanglesByFilename[filename][label]) {
                                rectanglesByFilename[filename][label] = [];
                            }

                            rectanglesByFilename[filename][label].push(rectangle);
                        });

                        resolve();
                    } catch (err) {
                        reject(err);
                    }
                };

                reader.onerror = reject;
                reader.readAsText(file);
            });
        });

        return Promise.all(filePromises).then(() => rectanglesByFilename);
    }

    function getAreaPoints() {
        if (areaFileFormat.value == "csv" || areaFileFormat.value == "csv-2") {
            return processCsvFile(uploadedAreaFile)
        } else if (areaFileFormat.value == "text") {
            return processUploadedAreaFiles()
        } else {
            notification("Unsupported area file format.", "failure")
            console.log("Unsupported area file format.")
        }
    }

    async function createAreaElements(dataset_id) {
        setCreatingElements(true);

        const area_points = await getAreaPoints();

        // Prepare labels array with name and color
        const SEEN_ELEMENTS = new Set([])
        let labelsArray = []

        for (const key in area_points) {
            for (const label in area_points[key]) {
                if (!SEEN_ELEMENTS.has(label)) {
                    labelsArray.push({
                        name: label,
                        color: randomColor(),
                        dataset: dataset_id
                    })
                    SEEN_ELEMENTS.add(label)
                }
                
            }
        }

        // Payload for backend
        const payload = {
            dataset: dataset_id,
            labels: labelsArray,
        };

        const URL = window.location.origin + '/api/create-labels/';
        const config = { headers: { 'Content-Type': 'application/json' } };

        axios.post(URL, JSON.stringify(payload), config)
            .then((res) => {
                const createdLabels = res.data.created || [];

                // Call the inner element creation function with all files + label IDs
                createAreaElementsInner(dataset_id, createdLabels.map((label) => label.id), area_points);
            })
            .catch((error) => {
                notification("Failed to create labels", "failure");
        });
    }

    function createAreaElementsInner(dataset_id, labels, area_points) {
        setCreatingElements(true);

        const URL = window.location.origin + '/api/upload-elements/';
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
    
        const chunks = chunkArray(uploadedAreaFiles, 10);
        let completed = 0;

        console.log(area_points)

        return
    
        async function uploadChunk(chunk, i) {
            const formData = new FormData();
            chunk.forEach(files => formData.append('files', files));
    
            formData.append('dataset', dataset_id);
            formData.append('index', i*10)  
    
            await uploadWithRetry(URL, formData, config);
        }
    
        async function uploadAllChunks() {
            const CONCURRENCY = 3;
            let current = 0;

            async function next() {
                if (current >= chunks.length) return;
                const i = current++;
                try {
                    await uploadChunk(chunks[i], i);
                } catch (e) {
                    console.error("Chunk upload failed:", e);
                    notification("Upload failed for one or more batches.", "failure");
                } finally {
                    completed++;
                    setCreatingElementsProgress((completed / (chunks.length * 4)) * 100);
                    await next(); // Start next after finishing one
                }
            }

            // Launch limited number of concurrent uploads
            await Promise.all(Array(CONCURRENCY).fill(0).map(next));

            let resInterval = null;
            let errorOccured = false;
            axios.post("/api/finalize-elements-upload/", {
                dataset: dataset_id,
                start_index: 0,
                labels: labels,
                area_points: area_points
            }).then((res) => {
                resInterval = setInterval(() => getTaskResult(
                    "deleting_dataset",
                    resInterval,
                    res.data["task_id"],
                    () => {
                    },
                    (data) => {
                        notification("Creating elements failed: " + data["message"], "failure")
                        errorOccured = true;
                    },
                    (data) => {
                        setCreatingElementsProgress(25 + (data["creating_elements_progress"] * 0.75) * 100)
                    },
                    () => {
                        setCreatingElementsProgress(100);
                        setTimeout(() => {
                            navigate("/home");
                            if (!errorOccured) {
                                notification("Successfully created dataset " + name + ".", "success");
                            }
                            
                            if (document.visibilityState !== "visible") {
                                alert("Dataset creation finished.")
                            }
                        }, 200);
                    }
                ), 3000)    // ping every 3 seconds
            });
        }

    
        uploadAllChunks();
    }

    function folderInputClick() {
        if (hiddenFolderInputRef.current) {
            hiddenFolderInputRef.current.click();
        }
    }

    function filenamesInputClick() {
        if (hiddenFilenamesInputRef.current) {
            hiddenFilenamesInputRef.current.click();
        }
    }

    function csvInputClick() {
        if (hiddenCsvInputRef.current) {
            hiddenCsvInputRef.current.click();
        }
    }

    function filesOnClick() {
        if (hiddenFilesInputRef.current) {
            hiddenFilesInputRef.current.click();
        }
    }

    function areaFileOnClick() {
        if (hiddenAreaInputRef.current) {
            hiddenAreaInputRef.current.click();
        }
    }

    function filterUploadedDatasets(tempObj) {

        let totalNumberLabels = 0;
        let totalCount = 0
        Object.entries(tempObj).forEach(([label, fileList]) => {
            totalNumberLabels += 1
        })
        let toTake = Math.floor((numberFiles || 10000) / totalNumberLabels)
        Object.entries(tempObj).forEach(([label, fileList]) => {
            tempObj[label] = fileList.slice(0, toTake)
            totalCount += tempObj[label].length
        })

        setUploadedFilesCount(totalCount)

        return tempObj

    }

    async function uploadFoldersAsLabels(e) {
        const ALLOWED_FILE_EXTENSIONS = (datasetType == "image" ? new Set(["png", "jpg", "jpeg", "webp", "avif"]) : new Set(["txt", "doc", "docx"]))
        setUploadingDatasetFolders(true)

        let notUploaded = []

        try {
            let files = e.target.files
            
            let tempObj = {...uploadedDatasets}    // Label name as key and value as an array of elements
            for (let i=0; i < files.length; i++) {
                let file = files[i]
                setUploadingPercentage(100 * (i+1) / files.length)

                let extension = file.name.split(".").pop().toLowerCase()
                if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
                    notUploaded.push(file.name)
                    continue
                }
                
                if (i == 0) {
                    let temp = [...uploadedFoldersAsLabels]
                    temp.push(file.webkitRelativePath.split("/")[0])
                    setUploadedFoldersAsLabels(temp)
                }
                let label = file.webkitRelativePath.split("/")[1].toLowerCase()
                if (INVALID_LABELS.has(label)) {
                    notification("Invalid label: " + label + ". Labels cannot be one of " + INVALID_LABELS, "failure")
                    continue
                }
                
                if (tempObj[label] == null) {tempObj[label] = []}
                tempObj[label].push(file)
            }

            setUploadedDatasets(filterUploadedDatasets(tempObj))

        } catch (e) {
            notification("An error occured. This may be due to incorrect formatting of uploaded dataset.", "failure")
        } finally {
            setTimeout(() => {
                setUploadingDatasetFolders(false)
                setUploadingPercentage(0)
                if (notUploaded.length > 0) {
                    notification("Did not upload " + notUploaded.join(", ") + " as these files' types are not supported for " + datasetType + " datasets.", "warning")
                } else {
                    notification("Successfully uploaded dataset.", "success")
                }
                e.target.value = "" // So same folder can be uploaded twice
            }, 200)
        }

    }

    async function uploadFilenamesAsLabels(e) {

        const ALLOWED_FILE_EXTENSIONS = (datasetType == "image" ? new Set(["png", "jpg", "jpeg", "webp", "avif"]) : new Set(["txt", "doc", "docx"]))

        let notUploaded = []

        setUploadingPercentage(0)
        setUploadingDatasetFilenames(true)
        try {
            let files = e.target.files
            
            let tempObj = {...uploadedDatasets}    // Label name as key and value as an array of elements

            for (let i=0; i < files.length; i++) {
                let file = files[i]
                setUploadingPercentage(100 * (i+1.0) / files.length)
                
                let extension = file.name.split(".").pop().toLowerCase()
                if (!ALLOWED_FILE_EXTENSIONS.has(extension)) {
                    notUploaded.push(file.name)
                    continue
                }

                if (i == 0) {   // For datasets to be shown
                    let temp = [...uploadedFilenamesAsLabels]
                    temp.push(file.webkitRelativePath.split("/")[0])
                    setUploadedFilenamesAsLabels(temp)
                }
                let label = file.name.split("_")[0].toLowerCase()
                if (INVALID_LABELS.has(label)) {
                    notification("Invalid label: " + label + ". Labels cannot be one of " + INVALID_LABELS, "failure")
                    continue
                }

                if (tempObj[label] == null) {tempObj[label] = []}
                tempObj[label].push(file)
                
            }

            setUploadedDatasets(filterUploadedDatasets(tempObj))

        } catch (e) {
            notification("An error occured. This may be due to incorrect formatting of uploaded dataset.", "failure")
        } finally {
            setTimeout(() => {
                setUploadingDatasetFilenames(false)
                setUploadingPercentage(0)
                if (notUploaded.length > 0) {
                    notification("Did not upload " + notUploaded.join(", ") + " as these files' types are not supported for " + datasetType + " datasets.", "failure")
                } else {
                    notification("Successfully uploaded dataset.", "success")
                }
                e.target.value = "" // So same folder can be uploaded twice
            }, 200)
        }
    }

    async function uploadCsv(e) {
        const file = e.target.files[0]
        if (!file) {return}

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            processCSV(text, e);
        };
        reader.readAsText(file);

        let tempUploadedCsvs = [...uploadedCsvs]
        tempUploadedCsvs.push(file.name)
        setUploadedCsvs(tempUploadedCsvs)
    }

    function processCSV(csvText, e) {
        const rows = csvText.split("\n").map(row => row.split(",")); // Splitting rows and columns

        let tempObj = {...uploadedDatasets}    // Label name as key and value as an array of elements
    
        setUploadingPercentage(0)
        setUploadingDatasetCsv(true)
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i][0] || !rows[i][1]) {
                setUploadingPercentage(100 * (i+1.0) / rows.length)
                continue
            }
            let label = rows[i][0]
            let text = rows[i][1].replaceAll('""', '"')
            let file = new File([text], `text_${i}.txt`, { type: "text/plain" });

            if (INVALID_LABELS.has(label)) {
                notification("Invalid label: " + label + ". Labels cannot be one of " + INVALID_LABELS, "failure")
                continue
            }

            if (tempObj[label] == null) {tempObj[label] = []}
            tempObj[label].push(file)
            setUploadingPercentage(100 * (i+1.0) / rows.length)
        }
        setUploadedDatasets(filterUploadedDatasets(tempObj))

        setTimeout(() => {
            setUploadingDatasetCsv(false)
            setUploadingPercentage(0)

            notification("Successfully uploaded dataset.", "success")
            

            e.target.value = "" // So same folder can be uploaded twice
        }, 200)
    }

    function imageOnClick() {
        if (imageInputRef.current) {
            imageInputRef.current.click()
        }
    }

    function isEmpty(obj) {
        for (const prop in obj) {
          if (Object.hasOwn(obj, prop)) {
            return false;
          }
        }
      
        return true;
    }

    function clearUploadedDatasets() {
        setUploadedDatasets({})
        setUploadedFilenamesAsLabels([])
        setUploadedFoldersAsLabels([])
        setUploadedCsvs([])
        setUploadedFilesCount(0)
        setUploadedAreaFiles([])
    }

    function setDatasetTypeImageInner(e) {
        setDatasetType(e.target.value)
        clearUploadedDatasets()
    }
    function setDatasetTypeImage(e) {
        if (!isEmpty(uploadedDatasets)) {
            activateConfirmPopup("Are you sure you want to change the dataset type? This will remove data from all uploaded datasets.", () => setDatasetTypeImageInner(e))
        } else {
            setDatasetTypeImageInner(e)
        }
    }

    function setDatasetTypeTextInner(e) {
        setDatasetType(e.target.value)
        clearUploadedDatasets()
        setType("classification")   // Area not valid for text datasets
    }
    function setDatasetTypeText(e) {
        if (!isEmpty(uploadedDatasets)) {
            activateConfirmPopup("Are you sure you want to change the dataset type? This will remove data from all uploaded datasets.", () => setDatasetTypeTextInner(e))
        } else {
            setDatasetTypeTextInner(e)
        }
    }

    return (
        <div className="create-dataset-container">
            <TitleSetter title="Dalinar | Create dataset" />

            {(uploadingDatasetFilenames || uploadingDatasetFolders || uploadingDatasetCsv) && <ProgressBar 
                progress={uploadingPercentage}
                message="Uploading..."
                BACKEND_URL={BACKEND_URL}></ProgressBar>}

            {creatingElements && <ProgressBar 
                progress={creatingElementsProgress}
                message="Processing..."
                BACKEND_URL={BACKEND_URL}></ProgressBar>}

            <div className="create-dataset-form">
                <h1 className="create-dataset-title">Create a dataset</h1>
                <p className="create-dataset-description">Datasets allow you to upload files (images or text) and label these accordingly. Datasets can then be passed to models in order to train or evaluate these.</p>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset type</p>
                    <input type="radio" id="create-dataset-type-image" name="imagetype" value="image" checked={datasetType == "image"} onChange={(e) => {
                        setDatasetTypeImage(e)
                    }} />
                    <label htmlFor="create-dataset-type-image" className="create-dataset-type-label">Image</label>
                    <input type="radio" id="create-dataset-type-text" name="texttype" value="text" checked={datasetType == "text"}  onChange={(e) => {
                        setDatasetTypeText(e)
                    }} />
                    <label htmlFor="create-dataset-type-text" className="create-dataset-type-label">Text</label>
                </div>
                <p className="create-dataset-description">Note that switching dataset type will remove uploaded datasets.</p>
                

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="dataset-name">Dataset name <span className="create-dataset-required">(required)</span></label>
                    <input className="create-dataset-inp" id="dataset-name" type="text" required value={name} onChange={(e) => {
                        setName(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <input type="file" accept="image/png, image/jpeg, image/webp" required className="hidden" ref={imageInputRef} onChange={(e) => {
                        if (e.target.files[0]) {
                            setImage(e.target.files[0])
                        }
                    }} />
                    {imageURL && <div className="create-dataset-image-container no-border" onClick={imageOnClick}>
                        <img className="create-dataset-image no-border" src={imageURL} alt="Dataset image" onClick={imageOnClick}/>
                        <div className="create-dataset-image-hover">
                            <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                        </div>
                    </div>}
                    {!imageURL && <div className="create-dataset-image-container" onClick={imageOnClick}>
                        <p className="create-dataset-image-text"><img className="create-dataset-image-icon" src={BACKEND_URL + "/static/images/image.png"} alt="Image" /> Upload image</p>
                    </div>}
                </div>

                <p className="create-dataset-image-description">
                    The image that will represent this dataset. Elements (in Home or Explore) are displayed with a 230x190 image, but in the dataset's page description the full image will be visible.
                </p>

                {datasetType == "image" && <div className="create-dataset-label-inp">
                    <p className="create-dataset-label" style={{margin: 0}}>Image dimensions</p>
                    <span className="create-dataset-image-dimensions-left">(</span>
                    <input type="number" className="create-dataset-inp create-dataset-inp-dimensions" min="0" max="10000" placeholder="Width" value={imageWidth} onChange={(e) => {
                        setImageWidth(e.target.value)
                    }}/>
                    <span className="create-dataset-image-dimensions-center">,</span>
                    <input type="number" className="create-dataset-inp create-dataset-inp-dimensions" min="0" max="10000" placeholder="Height" value={imageHeight} onChange={(e) => {
                        setImageHeight(e.target.value)
                    }}/>
                    <span className="create-dataset-image-dimensions-right">)</span>
                </div>}
                {datasetType == "image" && <p className="create-dataset-description">If specified, images uploaded to this dataset will be resized. Images cannot be manually resized in this case.
                    Note that images with dimensions larger than 1024px will be resized so their largest dimension is at most 1024px regardless.
                </p>}

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Type of data</p>
                    <input type="radio" id="create-dataset-type-classification" name="classification" value="classification" checked={type == "classification"} onChange={(e) => {
                        if (!isEmpty(uploadedDatasets)) {
                            activateConfirmPopup("This will remove all uploaded files. Are you sure you want to proceed?", () => {
                                setType(e.target.value)
                                clearUploadedDatasets()
                            })
                        } else {
                            setType(e.target.value)
                        }
                        
                    }} />
                    <label htmlFor="create-dataset-type-classification" className="create-dataset-type-label">Classification</label>
                    <input type="radio" id="create-dataset-type-area" className={(datasetType == "text" ? "dataset-type-disabled": "")} name="area" value="area" checked={type == "area"}  onChange={(e) => {
                        if (datasetType == "image") {
                            if (!isEmpty(uploadedDatasets)) {
                                activateConfirmPopup("This will remove all uploaded files. Are you sure you want to proceed?", () => {
                                    setType(e.target.value)
                                    clearUploadedDatasets()
                                })
                            } else {
                                setType(e.target.value)
                            }
                            
                        }
                        
                    }} />
                    <label htmlFor="create-dataset-type-area" className={"create-dataset-type-label " + (datasetType == "text" ? "dataset-type-disabled": "")}>Area <span className="create-dataset-required">(images only)</span></label>
                </div>
                <p className="create-dataset-description">
                    {type == "classification" ? "Each element will be assigned one label." : "Each element can have multiple areas, each of which is assigned one label and consists of an arbitrary number of points."}
                </p>

                <div className="create-dataset-label-inp create-dataset-label-inp-description">
                    <label className="create-dataset-label" htmlFor="dataset-description">Description</label>
                    <textarea className="create-dataset-inp create-dataset-full-width create-dataset-description-inp" id="dataset-description" type="text" value={description} onChange={(e) => {
                        setDescription(e.target.value)
                    }} />
                </div>

                <div className="create-dataset-label-inp">
                    <p className="create-dataset-label create-dataset-type">Dataset visibility</p>
                    <input type="radio" id="create-dataset-visibility-public" name="visibility" value="public" checked={visibility == "public"}  onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-public" className="create-dataset-type-label">Public</label>
                    <input type="radio" id="create-dataset-visibility-private" name="visibility" value="private" checked={visibility == "private"} onChange={(e) => {
                        setVisibility(e.target.value)
                    }} />
                    <label htmlFor="create-dataset-visibility-private" className="create-dataset-type-label">Private</label>
                    
                </div>

                <div className="create-dataset-label-inp">
                    <label className="create-dataset-label">Keywords <span className="create-dataset-required">({keywords.length}/3)</span></label>

                    <div className="create-dataset-keywords-inp-container">
                        <form className="create-dataset-keywords-inp-form" onSubmit={(e) => {
                            e.preventDefault()
                            if (keywords.length < 3) {
                                if (!keywords.includes(keywordCurrent.toLowerCase()) && keywordCurrent.length > 0) {
                                    let temp = [...keywords]
                                    temp.push(keywordCurrent.toLowerCase())
                                    setKeywords(temp)
                                    setKeywordCurrent("")
                                }
                                
                            } else {
                                notification("You can only add three keywords.", "failure")
                            }
                        }}>
                            <input type="text" className="create-dataset-keywords-inp" value={keywordCurrent} onChange={(e) => {
                                setKeywordCurrent(e.target.value)
                            }} />
                            <button type="submit" className="create-dataset-keywords-button">
                                <img className="create-dataset-keywords-icon" src={BACKEND_URL + "/static/images/plus.png"} alt="Plus" />
                                Add
                            </button>
                        </form>
                        
                    </div>
                    
                </div>

                {keywords.length > 0 && <div className="create-dataset-keywords-container">
                    {keywords.map((e, i) => (
                        <div key={i} className="create-dataset-keyword-element">
                            {e}
                            <img className="create-dataset-keyword-element-remove" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" onClick={() => {
                                let temp = [...keywords]
                                temp = temp.filter((keyword) => keyword != e)
                                setKeywords(temp)
                            }}/>
                        </div>
                    ))}
                </div>}

                {/*<div className="create-dataset-label-inp">
                    <label className="create-dataset-label" htmlFor="create-dataset-image">Image <span className="create-dataset-required">(required)</span></label>
                    
                </div>*/}

                <h1 className="create-dataset-title create-dataset-subtitle upload-dataset-title" onClick={() => {
                        setUploadDropdownVisible(!uploadDropdownVisible)
                    }}>Upload dataset 
                    <span className="create-dataset-title-optional">(optional)</span>
                    <img style={{rotate: (uploadDropdownVisible ? "180deg" : "0deg")}} className="upload-dataset-dropdown" src={BACKEND_URL + "/static/images/down.svg"} alt="Dropdown" />
                </h1>
                
                {uploadDropdownVisible && <div className="upload-dataset-form">
                    <p className="create-dataset-description" >
                        By uploading a dataset, this dataset will be created with the elements and labels provided. 
                        You can upload several datasets, of two different types seen below.
                        Note that improper formatting of uploaded datasets (see instructions below) may result in errors or incorrect labels.
                        Also note that label names will be set to lowercase.
                    </p>

                    <div className="create-dataset-label-inp" style={{width: "100%"}}>
                        <label className="create-dataset-label" htmlFor="dataset-number-files">Maximum number of files</label>
                        <input style={{width: "200px"}} className="create-dataset-inp" id="dataset-number-files" type="number" required value={numberFiles} onChange={(e) => {
                            setNumberFiles(e.target.value ? Math.max(0, e.target.value) : "")
                        }} />
                    </div>

                    <p className="create-dataset-description" >
                        The maximum number of files to take on uploads. Will take evenly from different labels, so the number taken may not be exactly the one specified. If omitted, all files will be uploaded.
                    </p>
                
                    {type == "classification" && <div className="upload-dataset-types-container">
                        {/* Uploading datasets goes through these */}
                        <input id="folders-as-labels-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFolderInputRef} onChange={(e) => {uploadFoldersAsLabels(e)}}/>
                        <input id="folders-as-labels-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFilenamesInputRef} onChange={(e) => uploadFilenamesAsLabels(e)}/>
                        <input id="csv-upload-inp" type="file" className="hidden" accept=".csv" ref={hiddenCsvInputRef} onChange={(e) => uploadCsv(e)}/>

                        <div className="upload-dataset-type-col">
                            <p className="upload-dataset-type-title">Folders as labels</p>
                            <p className="upload-dataset-type-description">
                                Will create labels for all subfolders in the uploaded folder, with elements in each subfolder belonging to that label.
                            </p>

                            <div className="upload-dataset-type-image-container" onClick={folderInputClick}>
                                <img className="upload-dataset-type-image" src={BACKEND_URL + "/static/images/foldersAsLabels.jpg"} alt="Folders as labels"  />
                            </div>
                            
                            <button type="button" className="upload-dataset-button" onClick={folderInputClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                                Upload dataset
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedFoldersAsLabels.map((e, i) => (
                                    <p title={e} key={i} className="uploaded-dataset-element">{e}</p>
                                ))}
                            </div>
                            
                        </div>
                        

                        <div className="upload-dataset-type-col">
                            <p className="upload-dataset-type-title">Filenames as labels</p>
                            <p className="upload-dataset-type-description">
                                Will create labels for every filename before the character '_' with such files belonging to that label, e.g. label1_2 will be read as belonging to label 1.
                            </p>

                            <div className="upload-dataset-type-image-container">
                                <img className="upload-dataset-type-image" src={BACKEND_URL + "/static/images/filenamesAsLabels.jpg"} alt="Filenames as labels" onClick={filenamesInputClick}/>
                            </div>

                            <button type="button" className="upload-dataset-button" onClick={filenamesInputClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                                Upload dataset
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedFilenamesAsLabels.map((e, i) => (
                                    <p title={e} key={i} className="uploaded-dataset-element">{e}</p>
                                ))}
                            </div>
                        </div>

                    </div>}

                    {type == "area" && <div className="upload-dataset-types-container-area">
                        <input id="folders-as-labels-upload-inp" type="file" className="hidden" directory="" webkitdirectory="" ref={hiddenFilesInputRef} onChange={(e) => {
                            if (e.target.files) {
                                setUploadedAreaFiles([...e.target.files].slice(0, numberFiles || 10000))
                            }
                        }}/>
                        {areaFileFormat != "text" && <input id="csv-upload-inp" type="file" accept=".csv" className="hidden" ref={hiddenAreaInputRef} onChange={(e) => {
                            if (e.target.files) {
                                setUploadedAreaFile(e.target.files[0])
                            }
                        }}/>}
                        {areaFileFormat.value == "text" && <input id="csv-upload-inp" type="file" multiple={true} accept=".txt" directory="" webkitdirectory="" className="hidden" ref={hiddenAreaInputRef} onChange={(e) => {
                            if (e.target.files) {
                                setUploadedAreaFile(Array.from(e.target.files).filter(file => file.name.toLowerCase().endsWith('.txt')).slice(0, numberFiles))
                            }
                        }}/>}

                        <div className="upload-dataset-type-row">
                            <p className="upload-dataset-type-title">Area Files Upload</p>

                            <button type="button" className="create-dataset-clear" style={{width: "100%"}} onClick={() => {
                                activateConfirmPopup("Are you sure you want to remove all uploaded datasets?", () => {
                                    clearUploadedDatasets()
                                    notification("Removed all uploaded datasets.", "success")
                                }, "blue")
                            }}>Clear images ({uploadedAreaFiles.length} images)</button>

                            <p className="upload-dataset-type-description" style={{marginBottom: "20px"}}>
                                The file that will be used to generate areas for the images. 
                                Note that specifying image dimensions may alter where the areas appear. 
                            </p>

                            <Select
                                inputId="area-file-format"
                                options={areaFileOptions}
                                value={areaFileFormat}
                                onChange={(selected) => {
                                    setAreaFileFormat(selected);
                                }}
                                styles={customStylesNoMargin}
                                className="w-full"
                            />

                            <p style={{marginTop: "10px"}} className="upload-dataset-type-description">
                                {(areaFileFormat.value == "csv" || areaFileFormat.value == "csv-2" ? "If no label is specified, all areas will be created for label 'default'. The first row of the .csv file will be ignored." : "")}
                                {(areaFileFormat.value == "text" ? "Upload a text file for each image uploaded, with the same name (excluding extension) as the image file it corresponds to. Will create an area for each row in the text file, where each row is split by the delimeter below. Expects x_start, y_start, x_end, y_end, label (optional)." : "")}
                            </p>

                            {areaFileFormat.value == "text" && <div className="create-dataset-label-inp" style={{width: "100%", marginTop: "10px"}}>
                                <label className="create-dataset-label" htmlFor="area-text-split">Delimeter</label>
                                <input style={{width: "100px"}} className="create-dataset-inp" id="area-text-split" type="text" required value={uploadedAreaDelimeter} onChange={(e) => {
                                    setUploadedAreaDelimeter(e.target.value)
                                }} />
                            </div>}
                            {areaFileFormat.value == "text" && <div className="create-dataset-label-inp" style={{width: "100%", marginTop: "10px"}}>
                                <label className="create-dataset-label" htmlFor="text-file-format">Format</label>
                                <Select
                                    inputId="text-file-format"
                                    options={textFormatOptions}
                                    value={uploadedTextFilesFormat}
                                    onChange={(selected) => {
                                        setUploadedTextFilesFormat(selected);
                                    }}
                                    styles={customStyles}
                                    className="w-full"
                                />
                            </div>}
                            
                            <button type="button" className="upload-dataset-button" style={{marginTop: "20px"}} onClick={areaFileOnClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                                Upload file{areaFileFormat.value == "text" ? "s" : ""}
                            </button>

                            {uploadedAreaFile && <div className="uploaded-dataset-element-container">
                                {areaFileFormat.value !== "text" && <p title={uploadedAreaFile.name} className="uploaded-dataset-element" style={{display: "flex", alignItems: "center"}}>
                                    <span className="text-ellipsis">{uploadedAreaFile.name}</span>
                                    <img className="uploaded-datasets-element-cross" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" onClick={() => {
                                        setUploadedAreaFile(null)
                                    }}/>
                                </p>}

                                {areaFileFormat.value === "text" && uploadedAreaFile.slice(0, 20).map((file, idx) => (
                                    <p key={idx} title={file.name} className="uploaded-dataset-element" style={{display: "flex", alignItems: "center"}}>
                                        <span className="text-ellipsis">{file.name}</span>
                                        <img className="uploaded-datasets-element-cross" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" onClick={() => {
                                            setUploadedAreaFiles((prev) => {
                                                prev.splice(idx, 1)
                                            })
                                        }}/>
                                    </p>
                                ))}
                                {areaFileFormat.value === "text" && uploadedAreaFile.length > 20 && <p className="upload-dataset-type-description" style={{textAlign: "center", width: "100%"}}>
                                    And {uploadedAreaFile.length - 20} other areas.
                                </p>}
                            </div>}
                        </div>

                        <div className="upload-dataset-type-row" style={{marginTop: "40px"}}>
                            <p className="upload-dataset-type-description">
                                The images that the dataset consists of can be uploaded here, or later. Will create an element for each uploaded image.
                            </p>
                            
                            <button type="button" className="upload-dataset-button" style={{marginTop: "20px"}} onClick={filesOnClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                                Upload images
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedAreaFiles.slice(0, 20).map((file, i) => (
                                    <p title={file.name} key={i} className="uploaded-dataset-element">{file.name}</p>
                                ))}
                                {uploadedAreaFiles.length > 20 && <p className="upload-dataset-type-description" style={{textAlign: "center", width: "100%"}}>
                                    And {uploadedAreaFiles.length - 20} other images.
                                </p>}
                            </div>
                        </div>

                        
                    </div>}

                    {datasetType == "text" && <div className="upload-dataset-type-col">
                            <p className="upload-dataset-type-title">.csv file</p>
                            <p className="upload-dataset-type-description">
                                Will create labels for values in the first column, with the elements being text in the second column. Note that the first row will be ignored.
                                Also note that double citations '""' will be replaced by '"' due to the way Dalinar saves .csv datasets.
                            </p>

                            <div className="upload-dataset-type-image-container">
                                <img className="upload-dataset-type-image" src={BACKEND_URL + "/static/images/csv.jpg"} onClick={csvInputClick} alt="csv" />
                            </div>
                            
                            <button type="button" className="upload-dataset-button" onClick={csvInputClick}>
                                <img className="upload-dataset-button-icon" src={BACKEND_URL + "/static/images/upload.svg"} alt="Upload" />
                                Upload dataset
                            </button>

                            <div className="uploaded-dataset-element-container">
                                {uploadedCsvs.map((e, i) => (
                                    <p title={e} key={i} className="uploaded-dataset-element">{e}</p>
                                ))}
                            </div>
                    </div>}

                    {!isEmpty(uploadedDatasets) && <div className="uploaded-datasets-labels-container">
                        <button type="button" className="create-dataset-clear" onClick={() => {
                            activateConfirmPopup("Are you sure you want to remove all uploaded datasets?", () => {
                                clearUploadedDatasets()
                                notification("Removed all uploaded datasets.", "success")
                            }, "blue")
                        }}>Clear uploads ({uploadedFilesCount} files)</button>

                        <div className="uploaded-datasets-label-element no-margin" style={{padding: 0, borderColor: "var(--border-light)"}}>
                            <div className="uploaded-datasets-label uploaded-datasets-label-element-title">Label</div>
                            <div className="uploaded-datasets-elements uploaded-datasets-label-element-title">Elements</div>
                        </div>
                        {Object.keys(uploadedDatasets).map((label, idx) => (
                            <div key={idx} className="uploaded-datasets-label-element">
                                <div className="uploaded-datasets-label" title={label}>{label}</div>
                                <div className="uploaded-datasets-elements">
                                    {uploadedDatasets[label].map((element, idx) => (
                                        <div key={idx} className="uploaded-datasets-element">
                                            <span className="uploaded-datasets-element-name" title={element.name}>{element.name}</span>
                                            <img className="uploaded-datasets-element-cross" src={BACKEND_URL + "/static/images/cross.svg"} alt="Cross" onClick={() => {
                                                let tempDatasets = {...uploadedDatasets}
                                                tempDatasets[label] = tempDatasets[label].filter((el) => {return el.webkitRelativePath != element.webkitRelativePath})
                                                setUploadedDatasets(tempDatasets)
                                                setUploadedFilesCount((prev) => (prev - 1))
                                            }}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>}
                </div>}

                <div className="create-dataset-buttons">
                    <button type="button" className="create-dataset-cancel" onClick={() => navigate("/home")}>Cancel</button>
                    <button type="button" className="create-dataset-submit" onClick={formOnSubmit}>
                        {loading && <img className="create-dataset-loading" src={BACKEND_URL + "/static/images/loading.gif"} alt="Loading" />}
                        {(!loading ? "Create dataset" : "Processing...")}
                    </button>
                </div>
                
            
            </div>
        </div>
    )
}

export default CreateDataset