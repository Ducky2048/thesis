package verifier

import (
	"encoding/json"
	"errors"
	"io/ioutil"
	"net/http"
)

type verifyRequest struct {
	Hash      string `json:"hash"`
	Signature string `json:"signature"` // base64 encoded protobuf file
}

type verifyResponse struct {
	Valid bool   `json:"valid"`
	Error string `json:"error,omitempty"`
}

func VerifyHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var in verifyRequest
	resp := verifyResponse{
		Valid: false,
	}
	if r.Body == nil {
		errorHandler(w, errors.New("no request body"), http.StatusBadRequest)
		return
	}
	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		errorHandler(w, err, http.StatusInternalServerError)
		return
	}
	if err = json.Unmarshal(body, &in); err != nil {
		errorHandler(w, err, http.StatusBadRequest)
		return
	}
	file, err := decodeSignatureFile(in)
	if err != nil {
		errorHandler(w, err, http.StatusBadRequest)
		return
	}
	if err = verifySignatureFile(file, in.Hash); err != nil {
		errorHandler(w, err, http.StatusInternalServerError)
		return
	}
	resp.Valid = true
	out, err := json.Marshal(resp)
	if err != nil {
		errorHandler(w, err, http.StatusInternalServerError)
		return
	}
	w.Write(out)
}

func errorHandler(w http.ResponseWriter, err error, code int) {
	w.WriteHeader(code)
	resp := verifyResponse{
		Valid: false,
		Error: err.Error(),
	}
	out,_ := json.Marshal(resp)
	w.Write(out)
}