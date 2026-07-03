![image]()


# LoopKnife

<!-- Header Start -->
<img align="right" alt="Stars Badge" src="https://img.shields.io/github/stars/jdsherbert/JDSherbert-Repo-Template?label=%E2%AD%90"/>
<img align="right" alt="Forks Badge" src="https://img.shields.io/github/forks/jdsherbert/JDSherbert-Repo-Template?label=%F0%9F%8D%B4"/>
<img align="right" alt="Watchers Badge" src="https://img.shields.io/github/watchers/jdsherbert/JDSherbert-Repo-Template?label=%F0%9F%91%81%EF%B8%8F"/>
<img align="right" alt="Issues Badge" src="https://img.shields.io/github/issues/jdsherbert/JDSherbert-Repo-Template?label=%E2%9A%A0%EF%B8%8F"/>

<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript">
  <img height="40" width="40" src="https://cdn.simpleicons.org/javascript" />
</a>
<a href="https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM">
  <img height="40" width="40" src="https://cdn.simpleicons.org/html5" />
</a>
<a href="https://developer.mozilla.org/en-US/docs/Web/CSS">
  <img height="40" width="40" src="https://cdn.simpleicons.org/css" />
</a>

<!-- Header End --> 

-----------------------------------------------------------------------

<a href="https://jdsherbert.github.io/LoopKnife/"> 
  <img align="left" alt="Live Tool" src="https://img.shields.io/badge/🚀%20Launch%20Tool-GitHub%20Pages-00ffcc?style=for-the-badge&logoColor=white&labelColor=151821"> </a>
  
<a href="https://choosealicense.com/licenses/mit/"> 
  <img align="right" alt="License" src="https://img.shields.io/badge/License%20:%20MIT-black?style=for-the-badge&logo=mit&logoColor=white&color=black&labelColor=black"> </a>
  
<br><br>

-----------------------------------------------------------------------

## Overview
#### 🔗 [Launch the Live Web Application Here](https://jdsherbert.github.io/LoopKnife/)

**LoopKnife™** is a lightweight, browser-based static interactive tool designed for sound designers and game developers to inject seamless loop points directly into audio metadata chunks. Built entirely with Vanilla JS and the Web Audio API, it provides an instantaneous, zero-install solution for prep-work before dragging assets into game engines like Unreal Engine, Unity, or Godot.

### 💡 The "Why" Behind LoopKnife™
Many popular game creation frameworks (most famously **RPG Maker**) as well as specialized audio middleware, require explicit, sample-accurate loop tags embedded directly inside the file metadata chunks to cycle background music or audio patterns seamlessly. Traditionally, achieving this requires a tedious, highly manual workflow: opening a full digital audio workstation (DAW) or sample editor like Audacity. You'd have to hunt down precise sample coordinate indexes, and using external command-line metadata utilities or specialized tagging software to write the markers.

I built LoopKnife to completely eliminate that friction. It brings that entire multi-step process into a single, instant, visual drag-and-drop web deck so you can slice your files, preview the seamless seam in real time, and export your engine-ready audio in seconds.
For most audio that needs to loop the full file, you can just import and then export immediately, which is extremely convenient.

---

## 🎯 Key Features
* **Zero-Server Static Environment:** Drag, drop, slice, and process safely right inside your browser context—no data leaves your local machine.
* **Precision Sample Seams:** Manipulate interactive canvas timeline boundaries or type exact millisecond/sample boundaries directly into the deck.
* **Metadata Injection:** Automatically bakes `LOOPSTART` and `LOOPEND` meta-tags into exported container streams.

---

## 🎛️ How to Use
1. **Load Track:** Drag and drop an audio file straight into the waveform window container, or click **🗁 Import Audio** at the top bar.
2. **Set Start Marker:** Move the <span style="color:#ffd700; font-weight:bold;">yellow marker</span> on the timeline canvas to define your loop opening point.
3. **Set End Marker:** Move the <span style="color:#ff4a4a; font-weight:bold;">red marker</span> to lock down your target exit boundary.
4. **Audition Seams:** Toggle **⏯ Play Loop** to cycle the audio block repeatedly, ensuring your seams loop seamlessly without audible pops or ticks.
5. **Bake & Export:** Click **🖫 Export** to grab your audio. It will be downloaded immediately.

---

## ⚠ Important Limitations & Session Notes
* **Supported Formats:** Metadata injection natively supports `.wav` and `.ogg` containers. Compressed architectures like MP3/AAC are incompatible due to padded block layout limitations (basically I haven't had time to dig that far yet).
* **Destructive Overwrites:** Existing internal marker chunks will be stripped and updated with your active parameters upon clicking Export. Make sure you keep a backup of your original file locally!
* **Browser Sampling Performance:** For microsecond perfect alignment, uncompressed WAV assets are heavily recommended over compressed formats to avoid tiny browser decoding drift variances.
* **Exporting:** For convenience, export returns the same audio file back to you as a download, with "_loop" appended to the file and in the same format as it was uploaded in.

---

## ⚖️ Intellectual Property & Privacy

* **The Tool:** **LoopKnife™** software, layout design, branding, and source code are developed by and belong to me (JDSherbert). 
* **Your Assets:** **You retain absolute 100% ownership of any audio files you load, manipulate, or export using this tool.** 
* **Data Privacy:** Because LoopKnife™ is a completely static web application utilizing the client-side Web Audio API, **no audio files are ever uploaded to a server.** All rendering, slicing, and metadata manipulation happen entirely within your local browser sandbox. Your data never leaves your machine.