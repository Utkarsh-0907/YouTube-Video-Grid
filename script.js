const videoContainer = document.getElementById("video-container");
const categoryContainer = document.getElementById("category-container");
const searchInput = document.getElementById("search-input");
const spinner = document.getElementById("spinner");

let nextPageToken = "";
let selectedCategories = [];
let searchQuery = "";
let searchTimeout = null;
const videosPerPage = 6;

function renderShimmer(count = videosPerPage) {
  for (let i = 0; i < count; i++) {
    const shimmerCard = document.createElement("div");
    shimmerCard.className = "shimmer-card";
    videoContainer.appendChild(shimmerCard);
  }
}

async function fetchVideos(pageToken = "") {
  if (!pageToken) videoContainer.innerHTML = "";
  renderShimmer();

  const categoryQuery = selectedCategories.length
    ? `&q=${selectedCategories.join("|")}`
    : "";

  const searchQueryParam = searchQuery ? `&q=${searchQuery}` : "";

  const searchUrl = `${CONFIG.SEARCH_URL}?part=snippet&type=video&maxResults=${videosPerPage}&pageToken=${pageToken}&regionCode=${CONFIG.REGION_CODE}&key=${CONFIG.API_KEY}${categoryQuery}${searchQueryParam}`;

  try {
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      videoContainer.innerHTML = "<p>No videos found.</p>";
      return;
    }
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    nextPageToken = searchData.nextPageToken || "";

    const detailsUrl = `${CONFIG.API_BASE_URL}?part=snippet,statistics&id=${videoIds}&key=${CONFIG.API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    renderVideos(detailsData.items);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    videoContainer.innerHTML = "<p>Failed to load videos.</p>";
  }
}

function renderVideos(videos) {
  videoContainer
    .querySelectorAll(".shimmer-card")
    .forEach((card) => card.remove());

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const videoCard = entry.target;
          const viewCountElement = videoCard.querySelector(".view-count");

          let viewCount = parseInt(
            viewCountElement.textContent.replace(/[^\d]/g, "")
          );
          viewCount += 1;
          viewCountElement.textContent = formatViewCount(viewCount.toString());

          // console.log(viewCount);
          
          observer.unobserve(videoCard);
        }
      });
    },
    {
      threshold: 0.5,
    }
  );

  videos.forEach((video) => {
    const { title, thumbnails, channelTitle } = video.snippet;
    const viewCount = video.statistics.viewCount || "N/A";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${thumbnails.high.url}" alt="${title}">
      <h3>${title}</h3>
      <p class="channel-title">${channelTitle}</p>
      <p class="view-count">${formatViewCount(viewCount)} views</p>
    `;

    observer.observe(card);

    videoContainer.appendChild(card);
  });
}

function formatViewCount(count) {
  if (count === "N/A") return count;
  const num = parseInt(count);
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return  
  }
  return num.toString();
}

function setupCategories() {
  const categories = ["Music", "Gaming", "News", "Sports", "Education"];
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.textContent = category;
    button.onclick = () => toggleCategory(category);
    button.classList.add("category-button");
    categoryContainer.appendChild(button);
  });

  const clearButton = document.createElement("button");
  clearButton.textContent = "Clear All";
  clearButton.onclick = clearCategories;
  categoryContainer.appendChild(clearButton);
}

function toggleCategory(category) {
  const button = Array.from(
    categoryContainer.getElementsByTagName("button")
  ).find((btn) => btn.textContent === category);

  if (selectedCategories.includes(category)) {
    selectedCategories = selectedCategories.filter((c) => c !== category);
    button.classList.remove("selected");
  } else {
    selectedCategories.push(category);
    button.classList.add("selected");
  }
  nextPageToken = "";
  fetchVideos();
}

function clearCategories() {
  selectedCategories = [];
  const buttons = categoryContainer.getElementsByTagName("button");
  Array.from(buttons).forEach((button) => button.classList.remove("selected"));
  nextPageToken = "";
  fetchVideos();
}

function handleSearch(event) {
  const query = event.target.value.trim();

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  searchTimeout = setTimeout(() => {
    searchQuery = query;
    nextPageToken = "";
    fetchVideos();
  }, 500);
}

window.addEventListener("scroll", () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    if (nextPageToken) {
      spinner.style.display = "block";
      fetchVideos(nextPageToken).finally(() => {
        spinner.style.display = "none";
      });
    }
  }
});

searchInput.addEventListener("input", handleSearch);

setupCategories();
fetchVideos();
