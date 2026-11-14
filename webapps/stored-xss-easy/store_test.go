package main

import "testing"

func TestNewStoreSeedsProducts(t *testing.T) {
	s := NewStore()
	products := s.Products()
	if len(products) == 0 {
		t.Fatalf("expected seeded products, got none")
	}
	for _, p := range products {
		if p.Name == "" {
			t.Errorf("product %d has empty name", p.ID)
		}
	}
}

func TestProductLookupFound(t *testing.T) {
	s := NewStore()
	first := s.Products()[0]
	got, ok := s.Product(first.ID)
	if !ok {
		t.Fatalf("expected product %d to be found", first.ID)
	}
	if got.ID != first.ID {
		t.Errorf("got product %d, want %d", got.ID, first.ID)
	}
}

func TestProductLookupNotFound(t *testing.T) {
	s := NewStore()
	_, ok := s.Product(999999)
	if ok {
		t.Errorf("expected product 999999 to not be found")
	}
}

func TestAddReviewToExistingProduct(t *testing.T) {
	s := NewStore()
	p := s.Products()[0]
	before := len(s.Reviews(p.ID))

	review, ok := s.AddReview(p.ID, "Alice", "Great product, fast shipping.")
	if !ok {
		t.Fatalf("expected AddReview to succeed for existing product")
	}
	if review.Name != "Alice" || review.Comment != "Great product, fast shipping." {
		t.Errorf("unexpected review contents: %+v", review)
	}

	after := s.Reviews(p.ID)
	if len(after) != before+1 {
		t.Errorf("expected review count %d, got %d", before+1, len(after))
	}
}

func TestAddReviewToMissingProductFails(t *testing.T) {
	s := NewStore()
	_, ok := s.AddReview(999999, "Bob", "hello")
	if ok {
		t.Errorf("expected AddReview to fail for missing product")
	}
}

func TestReviewsPreserveInsertionOrder(t *testing.T) {
	s := NewStore()
	p := s.Products()[0]
	s.AddReview(p.ID, "First", "one")
	s.AddReview(p.ID, "Second", "two")

	reviews := s.Reviews(p.ID)
	if len(reviews) < 2 {
		t.Fatalf("expected at least 2 reviews, got %d", len(reviews))
	}
	last := reviews[len(reviews)-1]
	secondLast := reviews[len(reviews)-2]
	if secondLast.Name != "First" || last.Name != "Second" {
		t.Errorf("unexpected order: %+v then %+v", secondLast, last)
	}
}

func TestResetRestoresSeedState(t *testing.T) {
	s := NewStore()
	p := s.Products()[0]
	seedCount := len(s.Reviews(p.ID))

	s.AddReview(p.ID, "Temp", "temporary review")
	if len(s.Reviews(p.ID)) != seedCount+1 {
		t.Fatalf("expected review to be added before reset")
	}

	s.Reset()
	if len(s.Reviews(p.ID)) != seedCount {
		t.Errorf("expected reset to restore seed review count %d, got %d", seedCount, len(s.Reviews(p.ID)))
	}
}
