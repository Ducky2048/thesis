interface FileChunkDataCallback {
    (data: ArrayBuffer): void
}

interface ErrorCallback {
    (message: string): void
}

interface FileReaderOnLoadCallback {
    (event: ProgressEvent): void
}

class Validate {
    public static notNull<T>(obj: T): obj is Exclude<T, null> {
        if (obj == null) {
            throw new ReferenceError(`Error: Object ${obj} was null`);
        }
        return true;
    }

    public static notUndefined<T>(obj: T): obj is Exclude<T, undefined> {
        if (obj === undefined) {
            throw new ReferenceError(`Error: Object ${obj} was undefined`);
        }
        return true;
    }

    public static notNullNotUndefined<T>(obj: T): obj is NonNullable<T> {
        return Validate.notNull(obj) && Validate.notUndefined(obj);
    }
}

class FileInChunksProcessor {
    public readonly CHUNK_SIZE_IN_BYTES: number = 1024*100;
    private readonly fileReader: FileReader;
    private readonly dataCallback: FileChunkDataCallback;
    private readonly errorCallback: ErrorCallback;
    private buffer: Uint8Array | null = null;
    private start: number = 0;
    private end: number = this.start + this.CHUNK_SIZE_IN_BYTES;
    private inputFile: File | null = null;

    constructor(dataCallback: FileChunkDataCallback, errorCallback: ErrorCallback) {
        this.fileReader = new FileReader();
        this.fileReader.onload = this.getFileReadOnLoadHandler();
        this.dataCallback = dataCallback;
        this.errorCallback = errorCallback;
    }

    public processChunks(inputFile: File) {
        this.inputFile = inputFile;
        this.read(this.start, this.end);
    }

    public getFileFromElement(elementId: string): File | undefined {
        const filesElement = document.getElementById(elementId) as HTMLInputElement;
        if (Validate.notNull(filesElement) &&
            Validate.notNull(filesElement.files)) {
            if (filesElement.files.length < 0) {
                this.errorCallback("Too few files specified. Please select one file.")
            } else if (filesElement.files.length > 1) {
                this.errorCallback("Too many files specified. Please select one file.")
            } else {
                return filesElement.files[0];
            }
        }
    }

    private getFileReadOnLoadHandler(): FileReaderOnLoadCallback {
        return () => {
            if (Validate.notNull(this.inputFile)) {
                this.buffer = new Uint8Array((this.fileReader.result as ArrayBuffer));
                this.dataCallback(this.buffer);

                this.start = this.end;
                if (this.end > this.inputFile.size) {
                    this.end = this.inputFile.size;
                } else {
                    this.end = this.start + this.CHUNK_SIZE_IN_BYTES;
                }
                if (this.end != this.inputFile.size) {
                    this.read(this.start, this.end);
                }
            }
        }
    }

    private read(start: number, end: number) {
        if (Validate.notNull(this.inputFile)) {
            this.fileReader.readAsArrayBuffer(this.inputFile.slice(start, end));
        }
    }
}


function handleData(data: ArrayBuffer) {
    // const resultElement = document.getElementById("result");
    // if (Validate.notNull(resultElement)) {
    //     resultElement.innerHTML = `${resultElement.innerHTML} <p>Got ${data.byteLength} bytes: ${data.slice(0, 10).toString()}...</p>`;
    // }
    // @ts-ignore
    wasmProgressiveHash(data);
}

function handleError(message: string) {
    const errorElement = document.getElementById("error");
    if (Validate.notNull(errorElement)) {
        errorElement.innerHTML = `${errorElement.innerHTML} <p>${message}</p>`;
    }
}

function processFileButtonHandler() {
    const processor = new FileInChunksProcessor(handleData, handleError);
    const file = processor.getFileFromElement("file");
    if (Validate.notNullNotUndefined(file)) {
        processor.processChunks(file);
        // @ts-ignore
        const result = wasmGetHash();
        const resultElement = document.getElementById("result");
        if (Validate.notNull(resultElement)) {
            resultElement.innerHTML = `<p>Got: ${result} </p>`;
        }
    }
}
