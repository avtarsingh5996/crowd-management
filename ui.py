```python
import streamlit as st
from streamlit.components.v1 import html

# Set page configuration for wide layout and custom title
st.set_page_config(
    page_title="Energy Monitoring and Asset Inventory Monitoring Solution",
    page_icon="⚡️",
    layout="wide"
)

# Custom CSS for dark theme and visual appeal
st.markdown(
    """
    <style>
    /* Main container */
    .stApp {
        background-color: #1E1E1E;
        color: #FFFFFF;
        font-family: 'Roboto', sans-serif;
    }
    
    /* Header styling */
    h1 {
        color: #00BFFF;
        text-align: center;
        font-size: 2.5em;
        margin-top: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }
    
    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        background-color: #2D2D2D;
        border-radius: 10px;
        padding: 10px;
    }
    .stTabs [data-baseweb="tab"] {
        color: #FFFFFF;
        font-weight: bold;
        border-radius: 8px;
        margin: 0 5px;
        padding: 10px 20px;
        transition: all 0.3s ease;
    }
    .stTabs [data-baseweb="tab"]:hover {
        background-color: #00BFFF;
        color: #1E1E1E;
    }
    .stTabs [aria-selected="true"] {
        background-color: #00BFFF;
        color: #1E1E1E;
    }
    
    /* Sidebar styling */
    .css-1d391kg {
        background-color: #2D2D2D;
        padding: 20px;
        border-right: 1px solid #00BFFF;
    }
    .sidebar .sidebar-content {
        color: #FFFFFF;
    }
    .sidebar h2 {
        color: #00BFFF;
        font-size: 1.5em;
    }
    .sidebar p {
        color: #B0B0B0;
        font-size: 1em;
    }
    
    /* Iframe container */
    .iframe-container {
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        margin: 20px 0;
    }
    
    /* General text */
    p, li {
        color: #B0B0B0;
    }
    
    /* Button hover effect */
    .stButton>button {
        background-color: #00BFFF;
        color: #1E1E1E;
        border-radius: 8px;
        transition: all 0.3s ease;
    }
    .stButton>button:hover {
        background-color: #1E90FF;
        color: #FFFFFF;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# Sidebar with navigation and description
with st.sidebar:
    st.markdown(
        """
        <h2>Dashboard Navigation</h2>
        <p>Select a tab to view the corresponding Grafana dashboard. Each dashboard provides real-time insights into energy monitoring and asset inventory.</p>
        """,
        unsafe_allow_html=True
    )
    st.markdown("### Dashboards:")
    st.markdown("- Smart Venue & Crowd Management")
    st.markdown("- Energy Sources Runtime")
    st.markdown("- Fault Management")
    st.markdown("- SNMP Devices Visualization")

# Main title
st.markdown(
    "<h1>Energy Monitoring and Asset Inventory Monitoring Solution</h1>",
    unsafe_allow_html=True
)

# Tabs for each Grafana dashboard
tab1, tab2, tab3, tab4 = st.tabs([
    "Smart Venue & Crowd Management",
    "Energy Sources Runtime",
    "Fault Management",
    "SNMP Devices Visualization"
])

# Replace with your Grafana server URL and dashboard UIDs
GRAFANA_BASE_URL = "http://your-grafana-server:3000"  # Update with your Grafana URL
DASHBOARD_URLS = {
    "smart_venue": f"{GRAFANA_BASE_URL}/d/smart-venue-crowd-dummy-stats/smart-venue-crowd-management-dashboard?orgId=1&kiosk",
    "energy_sources": f"{GRAFANA_BASE_URL}/d/energy-runtime-stats/energy-sources-runtime-dashboard?orgId=1&kiosk",
    "fault_management": f"{GRAFANA_BASE_URL}/d/fault-management-stats/fault-management-dashboard?orgId=1&kiosk",
    "snmp_devices": f"{GRAFANA_BASE_URL}/d/snmp-devices-visualization/snmp-devices-visualization-dashboard?orgId=1&kiosk"
}

# Embed dashboards in tabs using iframes
with tab1:
    st.markdown("<p>Monitoring smart venue statistics and crowd management.</p>", unsafe_allow_html=True)
    html(
        f"""
        <div class="iframe-container">
            <iframe src="{DASHBOARD_URLS['smart_venue']}" width="100%" height="800px" frameborder="0"></iframe>
        </div>
        """,
        height=820
    )

with tab2:
    st.markdown("<p>Tracking 24-hour runtime for various energy sources.</p>", unsafe_allow_html=True)
    html(
        f"""
        <div class="iframe-container">
            <iframe src="{DASHBOARD_URLS['energy_sources']}" width="100%" height="800px" frameborder="0"></iframe>
        </div>
        """,
        height=820
    )

with tab3:
    st.markdown("<p>Managing critical, major, minor, and warning alarms.</p>", unsafe_allow_html=True)
    html(
        f"""
        <div class="iframe-container">
            <iframe src="{DASHBOARD_URLS['fault_management']}" width="100%" height="800px" frameborder="0"></iframe>
        </div>
        """,
        height=820
    )

with tab4:
    st.markdown("<p>Visualizing SNMP device connectivity and status.</p>", unsafe_allow_html=True)
    html(
        f"""
        <div class="iframe-container">
            <iframe src="{DASHBOARD_URLS['snmp_devices']}" width="100%" height="800px" frameborder="0"></iframe>
        </div>
        """,
        height=820
    )
```
