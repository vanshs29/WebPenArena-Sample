package main

import (
	"sync"
	"time"
)

type Product struct {
	ID          int
	Name        string
	Description string
	PriceCents  int
}

type Review struct {
	ID        int
	ProductID int
	Name      string
	Comment   string
	CreatedAt time.Time
}

type seedReview struct {
	Name    string
	Comment string
}

var seedProducts = []Product{
	{ID: 1, Name: "Hand-Thrown Ceramic Mug", Description: "Glazed stoneware mug, microwave and dishwasher safe.", PriceCents: 2400},
	{ID: 2, Name: "Cedarwood Desk Organizer", Description: "Solid cedar tray with three compartments for a tidy desk.", PriceCents: 4200},
	{ID: 3, Name: "Linen Table Runner", Description: "Pre-washed linen runner, 180cm, fits most dining tables.", PriceCents: 3100},
}

var seedReviewsByProduct = map[int][]seedReview{
	1: {
		{Name: "Priya", Comment: "Lovely weight to it, my coffee stays warm longer than I expected."},
		{Name: "Marcus", Comment: "Glaze colour is slightly different from the photo but still nice."},
	},
	2: {
		{Name: "Jo", Comment: "Smells faintly of cedar for the first week, then settles down."},
	},
	3: {
		{Name: "Theo", Comment: "Wrinkled out of the box but ironed flat easily."},
	},
}

type Store struct {
	mu           sync.Mutex
	reviews      map[int][]Review
	nextReviewID int
}

func NewStore() *Store {
	s := &Store{}
	s.seedLocked()
	return s
}

func (s *Store) seedLocked() {
	s.reviews = make(map[int][]Review)
	s.nextReviewID = 1
	for _, p := range seedProducts {
		for _, sr := range seedReviewsByProduct[p.ID] {
			s.reviews[p.ID] = append(s.reviews[p.ID], Review{
				ID:        s.nextReviewID,
				ProductID: p.ID,
				Name:      sr.Name,
				Comment:   sr.Comment,
				CreatedAt: time.Now(),
			})
			s.nextReviewID++
		}
	}
}

func (s *Store) Products() []Product {
	out := make([]Product, len(seedProducts))
	copy(out, seedProducts)
	return out
}

func (s *Store) Product(id int) (Product, bool) {
	for _, p := range seedProducts {
		if p.ID == id {
			return p, true
		}
	}
	return Product{}, false
}

func (s *Store) Reviews(productID int) []Review {
	s.mu.Lock()
	defer s.mu.Unlock()
	src := s.reviews[productID]
	out := make([]Review, len(src))
	copy(out, src)
	return out
}

func (s *Store) AddReview(productID int, name, comment string) (Review, bool) {
	if _, ok := s.Product(productID); !ok {
		return Review{}, false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	review := Review{
		ID:        s.nextReviewID,
		ProductID: productID,
		Name:      name,
		Comment:   comment,
		CreatedAt: time.Now(),
	}
	s.reviews[productID] = append(s.reviews[productID], review)
	s.nextReviewID++
	return review, true
}

func (s *Store) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seedLocked()
}
