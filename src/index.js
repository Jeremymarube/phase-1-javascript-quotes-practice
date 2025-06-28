const quoteList = document.getElementById('quote-list');
const form = document.getElementById('new-quote-form');
const sortBtn = document.getElementById('sort-btn'); // Make sure this button exists in your HTML

const API_QUOTES = 'http://localhost:3000/quotes';
const API_QUOTES_EMBED = 'http://localhost:3000/quotes?_embed=likes';
const API_LIKES = 'http://localhost:3000/likes';

let isSortOn = false;
let quotesCache = []; // cache fetched quotes

function createQuoteCard(quote) {
  const li = document.createElement('li');
  li.className = 'quote-card';
  li.dataset.id = quote.id;

  const likesCount = quote.likesCount !== undefined ? quote.likesCount : (quote.likes ? quote.likes.length : 0);

  li.innerHTML = `
    <blockquote class="blockquote">
      <p class="mb-0">${quote.quote}</p>
      <footer class="blockquote-footer">${quote.author}</footer>
      <br>
      <button class='btn-success'>Likes: <span>${likesCount}</span></button>
      <button class='btn-danger'>Delete</button>
      <button class='btn-edit'>Edit</button>
    </blockquote>
    <form class="edit-form" style="display:none;">
      <input type="text" name="quote" value="${quote.quote}" required />
      <input type="text" name="author" value="${quote.author}" required />
      <button type="submit">Save</button>
      <button type="button" class="cancel-edit">Cancel</button>
    </form>
  `;

  // Like button event
  li.querySelector('.btn-success').addEventListener('click', () => {
    likeQuote(quote.id, li);
  });

  // Delete button event
  li.querySelector('.btn-danger').addEventListener('click', () => {
    deleteQuote(quote.id, li);
  });

  // Edit button event
  const editBtn = li.querySelector('.btn-edit');
  const editForm = li.querySelector('.edit-form');
  const cancelBtn = li.querySelector('.cancel-edit');

  editBtn.addEventListener('click', () => {
    editForm.style.display = 'block';
    editBtn.style.display = 'none';
  });

  cancelBtn.addEventListener('click', () => {
    editForm.style.display = 'none';
    editBtn.style.display = 'inline-block';
  });

  editForm.addEventListener('submit', e => {
    e.preventDefault();
    const updatedQuote = {
      quote: editForm.quote.value,
      author: editForm.author.value,
    };

    fetch(`${API_QUOTES}/${quote.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedQuote),
    })
      .then(res => res.json())
      .then(updated => {
        li.querySelector('p.mb-0').textContent = updated.quote;
        li.querySelector('footer.blockquote-footer').textContent = updated.author;
        editForm.style.display = 'none';
        editBtn.style.display = 'inline-block';
      });
  });

  return li;
}

function renderQuotes(quotes) {
  quoteList.innerHTML = '';
  quotes.forEach(quote => {
    const quoteCard = createQuoteCard(quote);
    quoteList.appendChild(quoteCard);
  });
}

function fetchLikesCount(quoteId) {
  return fetch(`${API_LIKES}?quoteId=${quoteId}`)
    .then(res => res.json())
    .then(likes => likes.length);
}

async function fetchQuotes() {
  const res = await fetch(API_QUOTES);
  const quotes = await res.json();

  // Fetch likes count for each quote
  for (const quote of quotes) {
    quote.likesCount = await fetchLikesCount(quote.id);
  }

  quotesCache = quotes;
  renderQuotes(quotesCache);
}

function likeQuote(quoteId, quoteLi) {
  fetch(API_LIKES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteId: Number(quoteId),
      createdAt: Math.floor(Date.now() / 1000),
    }),
  })
    .then(res => res.json())
    .then(() => {
      const likesSpan = quoteLi.querySelector('.btn-success span');
      likesSpan.textContent = Number(likesSpan.textContent) + 1;
    });
}

function deleteQuote(quoteId, quoteLi) {
  fetch(`${API_QUOTES}/${quoteId}`, { method: 'DELETE' })
    .then(() => {
      quoteLi.remove();
      // Also remove from cache
      quotesCache = quotesCache.filter(q => q.id !== quoteId);
    });
}

form.addEventListener('submit', e => {
  e.preventDefault();

  const newQuote = {
    quote: form.quote.value,
    author: form.author.value,
  };

  fetch(API_QUOTES, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newQuote),
  })
    .then(res => res.json())
    .then(quote => {
      // Fetch likesCount for new quote (should be 0)
      quote.likesCount = 0;
      quotesCache.push(quote);

      // If sorting is ON, resort, else just append
      if (isSortOn) {
        const sortedQuotes = [...quotesCache].sort((a, b) => a.author.localeCompare(b.author));
        renderQuotes(sortedQuotes);
      } else {
        const quoteCard = createQuoteCard(quote);
        quoteList.appendChild(quoteCard);
      }

      form.reset();
    });
});

if (sortBtn) {
  sortBtn.addEventListener('click', () => {
    isSortOn = !isSortOn;
    if (isSortOn) {
      sortBtn.textContent = 'Sort by Author: ON';
      const sortedQuotes = [...quotesCache].sort((a, b) => a.author.localeCompare(b.author));
      renderQuotes(sortedQuotes);
    } else {
      sortBtn.textContent = 'Sort by Author: OFF';
      const sortedById = [...quotesCache].sort((a, b) => a.id - b.id);
      renderQuotes(sortedById);
    }
  });
} else {
  console.warn('Sort button not found. Make sure there is a button with id="sort-btn" in your HTML');
}

// Initial load
fetchQuotes();
