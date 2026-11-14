package main

import "testing"

func TestContainsAngleBracketsTrue(t *testing.T) {
	if !containsAngleBrackets("nice <b>product</b>") {
		t.Errorf("expected true for input containing angle brackets")
	}
}

func TestContainsAngleBracketsFalse(t *testing.T) {
	if containsAngleBrackets("plain text review, 5 stars!") {
		t.Errorf("expected false for input without angle brackets")
	}
}

func TestRendersRawInOutputDetectsUnescapedRoundTrip(t *testing.T) {
	input := "<b>bold</b>"
	rendered := []byte("<div>comment: <b>bold</b></div>")
	if !rendersRawInOutput(input, rendered) {
		t.Errorf("expected raw round-trip to be detected")
	}
}

func TestRendersRawInOutputMissesEscapedRoundTrip(t *testing.T) {
	input := "<b>bold</b>"
	rendered := []byte("<div>comment: &lt;b&gt;bold&lt;/b&gt;</div>")
	if rendersRawInOutput(input, rendered) {
		t.Errorf("expected escaped output to not be flagged as raw round-trip")
	}
}

func TestRendersRawInOutputFalseWithoutAngleBrackets(t *testing.T) {
	input := "just words"
	rendered := []byte("<div>comment: just words</div>")
	if rendersRawInOutput(input, rendered) {
		t.Errorf("input without angle brackets should never flag reconnaissance")
	}
}

func TestMatchesInjectionSignatureScriptTag(t *testing.T) {
	if !matchesInjectionSignature("hello <script>alert(1)</script>") {
		t.Errorf("expected script tag to match injection signature")
	}
}

func TestMatchesInjectionSignatureScriptTagCaseInsensitive(t *testing.T) {
	if !matchesInjectionSignature("<ScRiPt>alert(1)</ScRiPt>") {
		t.Errorf("expected case-insensitive script tag to match")
	}
}

func TestMatchesInjectionSignatureEventHandlerAttribute(t *testing.T) {
	if !matchesInjectionSignature(`<img src=x onerror="alert(1)">`) {
		t.Errorf("expected onerror attribute to match injection signature")
	}
}

func TestMatchesInjectionSignatureBenignComment(t *testing.T) {
	if matchesInjectionSignature("I loved the packaging, arrived on time!") {
		t.Errorf("benign comment must not match injection signature")
	}
}

func TestMatchesInjectionSignatureBenignHTMLLikeText(t *testing.T) {
	if matchesInjectionSignature("5 out of 5 <3 this store") {
		t.Errorf("harmless angle-bracket text must not match injection signature")
	}
}
