document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantItems = details.participants.length
          ? details.participants.map((participant) => `
              <li>
                <span class="participant-email">${escapeHtml(participant)}</span>
                <button
                  type="button"
                  class="delete-participant"
                  data-activity="${escapeHtml(name)}"
                  data-email="${escapeHtml(participant)}"
                  aria-label="Unregister ${escapeHtml(participant)}"
                  title="Unregister participant"
                >&#128465;</button>
              </li>
            `).join("")
          : '<li class="no-participants">No participants yet</li>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <strong>Participants:</strong>
            <ul class="participants-list">
              ${participantItems}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      document.querySelectorAll(".delete-participant").forEach((button) => {
        button.addEventListener("click", unregisterParticipant);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function addParticipantToCard(activityName, participant) {
    const activityCard = Array.from(document.querySelectorAll(".activity-card"))
      .find((card) => card.querySelector("h4")?.textContent === activityName);

    if (!activityCard) {
      return;
    }

    const participantsList = activityCard.querySelector(".participants-list");
    const noParticipants = participantsList.querySelector(".no-participants");
    if (noParticipants) {
      noParticipants.remove();
    }

    const participantItem = document.createElement("li");
    participantItem.innerHTML = `
      <span class="participant-email">${escapeHtml(participant)}</span>
      <button
        type="button"
        class="delete-participant"
        data-activity="${escapeHtml(activityName)}"
        data-email="${escapeHtml(participant)}"
        aria-label="Unregister ${escapeHtml(participant)}"
        title="Unregister participant"
      >&#128465;</button>
    `;
    participantsList.appendChild(participantItem);
    participantItem.querySelector(".delete-participant")
      .addEventListener("click", unregisterParticipant);

    const availability = Array.from(activityCard.querySelectorAll("p"))
      .find((paragraph) => paragraph.textContent.startsWith("Availability:"));
    if (availability) {
      const currentSpots = Number.parseInt(
        availability.textContent.match(/(\d+)/)?.[1] || "0",
        10
      );
      availability.innerHTML = `<strong>Availability:</strong> ${Math.max(0, currentSpots - 1)} spots left`;
    }
  }

  async function unregisterParticipant(event) {
    const button = event.currentTarget;
    const activity = button.dataset.activity;
    const email = button.dataset.email;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        addParticipantToCard(activity, email);
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
