package main

import (
	"sync"
	"time"
)

// SessionRegistry tracks visit tokens the server itself has handed out via
// Set-Cookie. A beacon request is only meaningful proof that a payload
// executed in a real visitor's browser if the token it carries is one the
// server actually issued to some earlier visit; an arbitrary guessed value
// proves nothing.
type SessionRegistry struct {
	mu     sync.Mutex
	issued map[string]time.Time
}

func NewSessionRegistry() *SessionRegistry {
	return &SessionRegistry{issued: make(map[string]time.Time)}
}

func (r *SessionRegistry) Issue() string {
	token := randomToken()
	r.mu.Lock()
	defer r.mu.Unlock()
	r.issued[token] = time.Now()
	return token
}

func (r *SessionRegistry) IsIssued(token string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	_, ok := r.issued[token]
	return ok
}

func (r *SessionRegistry) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.issued = make(map[string]time.Time)
}
