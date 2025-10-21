const stories = [
    {
      title: "The Quiet River",
      date: "October 2025",
      excerpt: "The fog hung low over the water, swallowing the sound of oars dipping into the surface...",
      link: "stories/rainy-weather.html"
    },
    {
      title: "Through the Glass",
      date: "September 2025",
      excerpt: "Sometimes I wonder if reflections are just another world staring back at us...",
      link: "stories/through-the-glass.html"
    }
  ];
  
  const container = document.querySelector('.stories-container');
  
  stories.forEach(story => {
    const card = document.createElement('div');
    card.classList.add('story-card');
    card.innerHTML = `
      <h2>${story.title}</h2>
      <div class="meta">${story.date}</div>
      <p>${story.excerpt}</p>
      <a href="${story.link}" class="read-more">Read more →</a>
    `;
    container.appendChild(card);
  });
  