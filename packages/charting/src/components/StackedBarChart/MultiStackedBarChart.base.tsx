import * as React from 'react';
import { classNamesFunction } from 'office-ui-fabric-react/lib/Utilities';
import { IProcessedStyleSet, IPalette } from 'office-ui-fabric-react/lib/Styling';
import { ILegend, Legends } from '../Legends/index';
import {
  IChartDataPoint,
  IChartProps,
  IMultiStackedBarChartProps,
  IMultiStackedBarChartStyles,
  IMultiStackedBarChartStyleProps
} from './index';
import { Callout, DirectionalHint } from 'office-ui-fabric-react/lib/Callout';

const getClassNames = classNamesFunction<IMultiStackedBarChartStyleProps, IMultiStackedBarChartStyles>();

export interface IRefArrayData {
  legendText?: string;
  refElement?: SVGGElement;
}

export interface IMultiStackedBarChartState {
  isCalloutVisible: boolean;
  refArray: IRefArrayData[];
  legendSelected: string;
  refSelected: SVGGElement | null | undefined;
  dataForHoverCard: number;
  color: string;
}

export class MultiStackedBarChartBase extends React.Component<IMultiStackedBarChartProps, IMultiStackedBarChartState> {
  public static defaultProps: Partial<IMultiStackedBarChartProps> = {
    barHeight: 16,
    hideRatio: []
  };

  private _classNames: IProcessedStyleSet<IMultiStackedBarChartStyles>;

  public constructor(props: IMultiStackedBarChartProps) {
    super(props);
    this.state = {
      isCalloutVisible: false,
      refArray: [],
      legendSelected: '',
      refSelected: null,
      dataForHoverCard: 0,
      color: ''
    };
    this._onLeave = this._onLeave.bind(this);
  }

  public render(): JSX.Element {
    const { barHeight, data, theme, hideRatio, styles } = this.props;
    this._adjustProps();
    const { palette } = theme!;
    const legends = this._getLegendData(data!, hideRatio!, palette);
    const bars: JSX.Element[] = [];
    data!.map((singleChartData: IChartProps, index: number) => {
      const singleChartBars = this._createBarsAndLegends(singleChartData!, barHeight!, palette, hideRatio![index]);
      bars.push(<div key={index}>{singleChartBars}</div>);
    });
    this._classNames = getClassNames(styles!, {
      legendColor: this.state.color,
      theme: theme!
    });
    const { isCalloutVisible } = this.state;
    return (
      <div className={this._classNames.root}>
        {bars}
        {legends}
        {isCalloutVisible ? (
          <Callout
            gapSpace={0}
            target={this.state.refSelected}
            setInitialFocus={true}
            directionalHint={DirectionalHint.topRightEdge}
          >
            <div className={this._classNames.hoverCardRoot}>
              <div className={this._classNames.hoverCardTextStyles}>{this.state.legendSelected}</div>
              <div className={this._classNames.hoverCardDataStyles}>{this.state.dataForHoverCard}</div>
            </div>
          </Callout>
        ) : null}
      </div>
    );
  }

  private _createBarsAndLegends(
    data: IChartProps,
    barHeight: number,
    palette: IPalette,
    hideRatio: boolean
  ): JSX.Element {
    const defaultPalette: string[] = [palette.blueLight, palette.blue, palette.blueMid, palette.red, palette.black];
    // calculating starting point of each bar and it's range
    const startingPoint: number[] = [];
    const total = data.chartData!.reduce(
      (acc: number, point: IChartDataPoint) => acc + (point.data ? point.data : 0),
      0
    );
    let prevPosition = 0;
    let value = 0;
    const bars = data.chartData!.map((point: IChartDataPoint, index: number) => {
      const color: string = point.color ? point.color : defaultPalette[Math.floor(Math.random() * 4 + 1)];
      const pointData = point.data ? point.data : 0;
      if (index > 0) {
        prevPosition += value;
      }
      value = (pointData / total) * 100;
      startingPoint.push(prevPosition);
      const isSelected = this.state.legendSelected === point.legend!;
      const styles = this.props.styles;
      this._classNames = getClassNames(styles!, {
        theme: this.props.theme!,
        isSelected: isSelected,
        isChartSelected: this.state.isCalloutVisible
      });
      return (
        <g
          key={index}
          className={this._classNames.opacityChangeOnHover}
          ref={(e: SVGGElement) => {
            this._refCallback(e, point.legend!);
          }}
          onMouseOver={this._onHover.bind(this, point.legend!, pointData, color)}
          onMouseLeave={this._onLeave}
        >
          <rect key={index} x={startingPoint[index] + '%'} y={0} width={value + '%'} height={barHeight} fill={color} />
        </g>
      );
    });
    if (data.chartData!.length === 0) {
      bars.push(
        <g key={0}>
          <rect key={0} x={'0%'} y={0} width={'100%'} height={barHeight} fill={palette.neutralTertiaryAlt} />
        </g>
      );
    }
    const hideNumber = hideRatio === undefined ? false : hideRatio;
    const showRatio = !hideNumber && data!.chartData!.length === 2;
    const showNumber = !hideNumber && data!.chartData!.length === 1;
    return (
      <div className={this._classNames.singleChartRoot}>
        <div className={this._classNames.chartTitle}>
          {data!.chartTitle && (
            <div>
              <strong>{data!.chartTitle}</strong>
            </div>
          )}
          {showRatio && (
            <div>
              <strong>{data!.chartData![0].data}</strong>/{total}
            </div>
          )}
          {showNumber && (
            <div>
              <strong>{data!.chartData![0].data}</strong>
            </div>
          )}
        </div>
        <svg className={this._classNames.chart}>{bars}</svg>
      </div>
    );
  }

  private _refCallback(element: SVGGElement, legendTitle: string): void {
    this.state.refArray.push({ legendText: legendTitle, refElement: element });
  }

  private _adjustProps = (): void => {
    const { theme, className, styles, width, barHeight } = this.props;
    this._classNames = getClassNames(styles!, {
      legendColor: this.state.color,
      theme: theme!,
      width: width,
      className,
      barHeight: barHeight
    });
  };

  private _onHover(customMessage: string, pointData: number, color: string): void {
    if (!this.state.isCalloutVisible || this.state.legendSelected !== customMessage) {
      const refArray = this.state.refArray;
      const currentHoveredElement = refArray.find(
        (eachElement: IRefArrayData) => eachElement.legendText === customMessage
      );
      this.setState({
        isCalloutVisible: true,
        refSelected: currentHoveredElement!.refElement,
        legendSelected: customMessage,
        dataForHoverCard: pointData,
        color: color
      });
    }
  }

  private _getLegendData = (data: IChartProps[], hideRatio: boolean[], palette: IPalette): JSX.Element => {
    const defaultPalette: string[] = [palette.blueLight, palette.blue, palette.blueMid, palette.red, palette.black];
    const actions: ILegend[] = [];
    data.map((singleChartData: IChartProps, index: number) => {
      if (singleChartData.chartData!.length < 3) {
        const hideNumber = hideRatio[index] === undefined ? false : hideRatio[index];
        if (hideNumber) {
          singleChartData.chartData!.map((point: IChartDataPoint) => {
            const color: string = point.color ? point.color : defaultPalette[Math.floor(Math.random() * 4 + 1)];
            const pointData = point.data ? point.data : 0;
            const legend: ILegend = {
              title: point.legend!,
              color: color,
              action: () => {
                this._onHover(point.legend!, pointData, color);
              },
              hoverAction: () => {
                this._onHover(point.legend!, pointData, color);
              },
              onMouseOutAction: () => {
                this._onLeave();
              }
            };
            actions.push(legend);
          });
        }
      } else {
        singleChartData.chartData!.map((point: IChartDataPoint) => {
          const color: string = point.color ? point.color : defaultPalette[Math.floor(Math.random() * 4 + 1)];
          const pointData = point.data ? point.data : 0;
          const legend: ILegend = {
            title: point.legend!,
            color: color,
            action: () => {
              this._onHover(point.legend!, pointData, color);
            },
            hoverAction: () => {
              this._onHover(point.legend!, pointData, color);
            },
            onMouseOutAction: () => {
              this._onLeave();
            }
          };
          actions.push(legend);
        });
      }
    });
    return <Legends legends={actions} />;
  };

  private _onLeave(): void {
    if (this.state.isCalloutVisible) {
      this.setState({
        isCalloutVisible: false,
        refSelected: null,
        legendSelected: '',
        dataForHoverCard: 0,
        color: ''
      });
    }
  }
}
