import "@unocss/reset/tailwind.css";
import "virtual:uno.css";
import "./style.css";
import { mount } from "svelte";
import App from "./App.svelte";

mount(App, { target: document.getElementById("app")! });
