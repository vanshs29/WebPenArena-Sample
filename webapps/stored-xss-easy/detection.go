package main

import (
	"bytes"
	"regexp"
	"strings"
)

func containsAngleBrackets(s string) bool {
	return strings.ContainsAny(s, "<>")
}

func rendersRawInOutput(input string, rendered []byte) bool {
	if !containsAngleBrackets(input) {
		return false
	}
	return bytes.Contains(rendered, []byte(input))
}

var injectionSignature = regexp.MustCompile(`(?i)<script\b|\bon[a-z]+\s*=`)

func matchesInjectionSignature(comment string) bool {
	return injectionSignature.MatchString(comment)
}
