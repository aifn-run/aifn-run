<template>
  <div class="h-full flex items-center justify-center">
    <div class="bg-white rounded-xl mx-auto p-8 border shadow-lg">
      <figure>
        <img
          class="w-24 h-24 rounded-full mx-auto"
          :src="profile.photo"
          alt=""
          width="384"
          height="512"
        />
        <figcaption class="block pt-4 text-center">
          {{ profile.displayName }}
        </figcaption>
      </figure>
      <hr class="mt-4" />
      <button
        type="button"
        @click="signOut()"
        class="block bg-white text-gray-800 p-2 text-sm rounded shadow mt-4 mx-auto"
      >
        Logout
      </button>
    </div>
  </div>
</template>
<script setup>
import { useAuth } from "../../composables/useAuth";

const { profile, signOut } = useAuth();
</script>
