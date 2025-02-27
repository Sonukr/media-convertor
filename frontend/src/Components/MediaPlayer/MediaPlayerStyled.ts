import styled from "@emotion/styled";
import { Slider } from "@mui/material";
import { styled as MaterialStyled } from "@mui/material/styles";

export const AudioMusicTitleWrapper = styled.div`
  display: flex;
`;

export const AudioMusicTitle = styled.p`
  font-size: 14px;
  font-weight: 500 !important;
  white-space: nowrap;        
  overflow: hidden;           
  text-overflow: ellipsis;    
  margin: 3px;
`;

export const AudioMusicTime = styled.p`
  font-size: 14px;
  font-weight: 400 !important;
  color: #5B5B65;
  flex-grow: 0;
  white-space: nowrap;
  margin: 0;
`;

export const AudioMusicSlider = MaterialStyled(Slider)(({ theme }) => ({
  height: "4px",
  color: "#1D2D53",
  borderRadius: "2px",
  paddingTop: "6px",
  flexGrow: 1,
  marginLeft: "12px",
  "& .MuiSlider-thumb": {
    height: "10px",
    width: "8.94px",
    borderRadius: "5px",
    backgroundColor: "#000000",
    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "inherit",
    },
    "&:before": {
      display: "none",
    }
  }
}));


export const VideoMusicTitle = styled.p`
  font-size: 14px;
  font-weight: 500 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  position: absolute;
  z-index: 2;
  color: #FFFFFF;
  background-color: rgba(0, 0, 0, 0.2);
  padding: 4px 8px;
  margin: 0;
`;

export const VideoMusicTime = styled.p`
  font-size: 14px;
  font-weight: 400 !important;
  color: white;
  flex-grow: 0;
  white-space: nowrap;
  margin: 0;
`;

export const VideoMusicSlider = MaterialStyled(Slider)(({ theme }) => ({
  height: "4px",
  color: "white",
  borderRadius: "2px",
  paddingTop: "10px",
  marginLeft: "4px",
  marginRight: "8px",
  flexGrow: 1,
  "& .MuiSlider-thumb": {
    height: "10px !important",
    width: "8.94px !important",
    borderRadius: "5px",
    backgroundColor: "white !important",
    "&:focus, &:hover, &.Mui-active, &.Mui-focusVisible": {
      boxShadow: "inherit !important",
    },
    "&:before": {
      display: "none !important",
    }
  }
}));