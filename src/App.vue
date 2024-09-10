<template>
  <div id="app">
    <ReplayVideo />
  </div>
</template>

<script>
import ReplayVideo from './components/ReplayVideo.vue'

export default {
  name: 'App',
  components: {
    ReplayVideo
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
