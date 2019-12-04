package verifier

import (
	"context"
	"errors"
	"fmt"
	"github.com/coreos/go-oidc"
	"gopkg.in/square/go-jose.v2"
	"time"
)

type idTokenVerifier struct {
	token     []byte
	issuer    string
	clientId  string
	nonce     chan string
	notAfter  func() time.Time
	key       jose.JSONWebKey
	ltvData   map[string]*LTV
	verifyLTV bool
	ctx       context.Context
}

func NewIDTokenVerifier(signatureData *SignatureData, cfg *Config, notAfter time.Time) (*idTokenVerifier, error) {
	if signatureData == nil || cfg == nil {
		return nil, errors.New("signature data or cfg can't be nil")
	}
	i := &idTokenVerifier{
		token:    signatureData.IdToken,
		issuer:   cfg.Issuer,
		clientId: cfg.ClientId,
		nonce:    make(chan string, 1),
		notAfter: notAfter.Local,
		ltvData:  signatureData.LtvIdp,
		ctx:      context.Background(),
		key:      jose.JSONWebKey{},
	}
	if err := i.key.UnmarshalJSON(signatureData.JwkIdp); err != nil {
		return nil, fmt.Errorf("could not unmarshal jwk: %w", err)
	}
	return i, nil
}

func (i *idTokenVerifier) VerifySignature(ctx context.Context, jwtRaw string) (payload []byte, err error) {
	signature, err := jose.ParseSigned(jwtRaw)
	if err != nil {
		return nil, fmt.Errorf("could not parse token: %w", err)
	}

	return signature.Verify(i.key)
}

func (i *idTokenVerifier) getNonce() string {
	return <-i.nonce
}

func (i *idTokenVerifier) Verify(verifyLTV bool) error {
	cfg := &oidc.Config{
		ClientID: i.clientId,
		Now:      i.notAfter,
	}
	verifier := oidc.NewVerifier(i.issuer, i, cfg)
	idToken, err := verifier.Verify(i.ctx, string(i.token))
	if err != nil {
		return err
	}

	i.nonce <- idToken.Nonce

	var emailClaims struct {
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
	}

	if err = idToken.Claims(&emailClaims); err != nil {
		return err
	}
	if !emailClaims.EmailVerified {
		return errors.New("e-mail was not verified")
	}
	if verifyLTV {
		l := LTVVerifier{
			Certs:   i.key.Certificates,
			LTVData: i.ltvData,
		}
		if err = l.Verify(); err != nil {
			return fmt.Errorf("verifyLTV information for id token not valid: %w", err)
		}
	}

	return nil
}
