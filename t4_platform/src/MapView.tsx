import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature from "ol/Feature";
import Polygon from "ol/geom/Polygon";
import Point from "ol/geom/Point";
import { fromLonLat, toLonLat, transformExtent } from "ol/proj";
import { Fill, Stroke, Style, Circle, Text } from "ol/style";
import Graticule from "ol/layer/Graticule";
import type { MapResult } from "./model";
import { cellAt, color } from "./model";
import "ol/ol.css";
export default function MapView({
  data,
  centers,
  onSelect,
}: {
  data: MapResult | null;
  centers: boolean;
  onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    map = useRef<Map | null>(null),
    field = useRef(new VectorSource()),
    points = useRef(new VectorSource()),
    selected = useRef(new VectorSource()),
    callback = useRef(onSelect);
  callback.current = onSelect;
  const extent = transformExtent([108, 20, 118, 24], "EPSG:4326", "EPSG:3857");
  useEffect(() => {
    const m = new Map({
      target: host.current!,
      layers: [
        new VectorLayer({
          source: new VectorSource({
            url: "/land.geojson",
            format: new GeoJSON(),
          }),
          style: new Style({
            fill: new Fill({ color: "#edf0e8" }),
            stroke: new Stroke({ color: "#b7c9c6", width: 1 }),
          }),
        }),
        new Graticule({
          showLabels: true,
          strokeStyle: new Stroke({ color: "#9bb8bc55", width: 1 }),
          wrapX: false,
        }),
        new VectorLayer({ source: field.current }),
        new VectorLayer({
          source: points.current,
          style: new Style({
            image: new Circle({
              radius: 7,
              fill: new Fill({ color: "#fff" }),
              stroke: new Stroke({ color: "#d97635", width: 3 }),
            }),
            text: new Text({
              text: "模拟中心",
              offsetY: -19,
              font: "12px sans-serif",
              fill: new Fill({ color: "#8a421e" }),
              backgroundFill: new Fill({ color: "#ffffffdd" }),
              padding: [3, 5, 3, 5],
            }),
          }),
        }),
        new VectorLayer({
          source: selected.current,
          style: new Style({
            stroke: new Stroke({ color: "#123d53", width: 3 }),
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([113, 22]),
        zoom: 6,
        minZoom: 5,
        maxZoom: 11,
        extent: transformExtent([105, 18, 121, 27], "EPSG:4326", "EPSG:3857"),
      }),
    });
    map.current = m;
    m.getView().fit(extent, { padding: [55, 45, 55, 45] });
    m.on("singleclick", (e) => {
      const [lon, lat] = toLonLat(e.coordinate);
      const id = cellAt(lon, lat);
      if (id) {
        callback.current(id);
        const match = /r(\d+)c(\d+)/.exec(id)!;
        const x = 108 + Number(match[2]) * 0.1,
          y = 20 + Number(match[1]) * 0.1;
        selected.current.clear();
        selected.current.addFeature(
          new Feature(
            new Polygon([
              [
                [x, y],
                [x + 0.1, y],
                [x + 0.1, y + 0.1],
                [x, y + 0.1],
                [x, y],
              ],
            ]).transform("EPSG:4326", "EPSG:3857"),
          ),
        );
      }
    });
    const observer = new ResizeObserver(() => m.updateSize());
    observer.observe(host.current!);
    return () => {
      observer.disconnect();
      m.setTarget(undefined);
      map.current = null;
    };
  }, []);
  useEffect(() => {
    field.current.clear();
    selected.current.clear();
    if (!data || data.status !== "ready") return;
    const g = data.grid;
    const features = data.values.flatMap((v, i) => {
      if (v === null) return [];
      const r = Math.floor(i / g.cols),
        c = i % g.cols,
        x = g.origin[0] + c * g.step,
        y = g.origin[1] + r * g.step;
      const f = new Feature(
        new Polygon([
          [
            [x, y],
            [x + g.step, y],
            [x + g.step, y + g.step],
            [x, y + g.step],
            [x, y],
          ],
        ]).transform("EPSG:4326", "EPSG:3857"),
      );
      f.setStyle(
        new Style({
          fill: new Fill({
            color: color(
              (v - data.layer.min) / (data.layer.max - data.layer.min),
            ),
          }),
        }),
      );
      return [f];
    });
    field.current.addFeatures(features);
  }, [data]);
  useEffect(() => {
    points.current.clear();
    if (centers && data?.status === "ready")
      points.current.addFeatures(
        data.centers.map(
          (p) => new Feature(new Point(fromLonLat([p.lon, p.lat]))),
        ),
      );
  }, [data, centers]);
  return (
    <div className="map-wrap">
      <div className="map" ref={host} aria-label="渔情地图" data-testid="map" />
      <button
        className="reset-map"
        onClick={() =>
          map.current
            ?.getView()
            .fit(extent, { padding: [55, 45, 55, 45], duration: 200 })
        }
      >
        ⌖ 恢复研究区
      </button>
      <div className="map-note">
        WGS84 · 20–24°N / 108–118°E
        <br />
        Natural Earth · 离线自然地理底图
      </div>
    </div>
  );
}
