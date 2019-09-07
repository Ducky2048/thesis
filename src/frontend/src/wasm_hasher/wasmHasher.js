function wasmProgressiveHash(input) {
    progressiveHash(input);
}

function wasmStartHash() {
    starthash();
}

function wasmGetHash() {
    return getHash();
}

(function() {
    if (!WebAssembly.instantiateStreaming) {
        WebAssembly.instantiateStreaming = async (resp, importObject) => {
            const source = await (await resp).arrayBuffer();
            return await WebAssembly.instantiate(source, importObject);
        }
    }
    const go = new Go();
    let mod, inst;
    WebAssembly.instantiateStreaming(fetch("../test.wasm"), go.importObject).then(
        async result => {
            mod = result.module;
            inst = result.instance;
            await go.run(inst);
        }
    );
})();
