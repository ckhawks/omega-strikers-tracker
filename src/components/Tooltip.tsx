"use client";

import React from "react";
import { OverlayTrigger, Tooltip as BootstrapTooltip } from "react-bootstrap";

export default function Tooltip(props: { text: any; children: any }) {
  const { text } = props; // Destructure with default

  const renderTooltip = (props: any) => (
    <BootstrapTooltip id="button-tooltip" {...props}>
      {text}
    </BootstrapTooltip>
  );

  return (
    <OverlayTrigger
      // placement="bottom"
      delay={{ show: 0, hide: 200 }}
      overlay={renderTooltip}
    >
      {React.Children.only(props.children)}
    </OverlayTrigger>
  );
}
