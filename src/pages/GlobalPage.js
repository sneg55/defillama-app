import React, { useEffect, useState, useMemo } from 'react'
import { withRouter } from 'react-router-dom'
import styled from 'styled-components'

import { AutoRow, RowBetween, RowFlat } from '../components/Row'
import Loader from '../components/LocalLoader'
import ProtocolChart from '../components/ProtocolChart'
import { AutoColumn } from '../components/Column'
import TopTokenList from '../components/TokenList'
import GlobalChart from '../components/GlobalChart'
import Search from '../components/Search'
import { ButtonLight, ButtonDark } from '../components/ButtonStyled'

import { useGlobalData } from '../contexts/GlobalData'
import { useMedia } from 'react-use'
import Panel from '../components/Panel'
import { useAllTokenData } from '../contexts/TokenData'
import { formattedNum } from '../utils'
import { TYPE, ThemedBackground } from '../Theme'
import { transparentize } from 'polished'
import { CustomLink, BasicLink } from '../components/Link'

import { PageWrapper, ContentWrapper } from '../components'
import { fetchAPI } from '../contexts/API'
import { CHART_API } from '../constants'
import DropdownSelect from '../components/DropdownSelect'
import { Redirect } from 'react-router-dom'
import RightSettings from '../components/RightSettings'
import { useStakingManager, usePool2Manager } from '../contexts/LocalStorage'

const ListOptions = styled(AutoRow)`
  height: 40px;
  width: 100%;
  font-size: 1.25rem;
  font-weight: 600;

  @media screen and (max-width: 640px) {
    font-size: 1rem;
  }
`

const chainOptions = ['All', 'Ethereum', 'Solana', 'Polygon', 'Fantom', 'Terra', 'Avalanche', 'Binance', 'Others']

function GlobalPage({ chain, denomination, history }) {
  // get data for lists and totals
  let allTokensOriginal = useAllTokenData()
  //const transactions = useGlobalTransactions()
  const globalData = useGlobalData()
  const [chainChartData, setChainChartData] = useState({});
  const selectedChain = chain;
  const setSelectedChain = (newSelectedChain) => history.push(newSelectedChain === 'All' ? '/home' : `/chain/${newSelectedChain}`)
  // breakpoints
  const below800 = useMedia('(max-width: 800px)')
  // scrolling refs
  useEffect(() => {
    document.querySelector('body').scrollTo({
      behavior: 'smooth',
      top: 0
    })
  }, [])
  const [stakingEnabled] = useStakingManager()
  const [pool2Enabled] = usePool2Manager()

  let { totalVolumeUSD, volumeChangeUSD } = globalData

  useEffect(() => {
    if (selectedChain !== undefined && chainChartData[selectedChain] === undefined) {
      fetchAPI(`${CHART_API}/${selectedChain}`).then(chart => setChainChartData({
        [selectedChain]: chart
      }))
    }
  }, [selectedChain])

  if (selectedChain !== undefined) {
    const chartData = chainChartData[selectedChain];
    if (chartData === undefined) {
      totalVolumeUSD = 0;
      volumeChangeUSD = 0;
    } else {
      totalVolumeUSD = chartData[chartData.length - 1].totalLiquidityUSD
      if (chartData.length > 1) {
        volumeChangeUSD = ((chartData[chartData.length - 1].totalLiquidityUSD - chartData[chartData.length - 2].totalLiquidityUSD) /
          chartData[chartData.length - 2].totalLiquidityUSD) *
          100
      } else {
        volumeChangeUSD = 0
      }
    }
  }
  const [tokensList, otherChains] = useMemo(() => {
    const chainsSet = new Set([])

    let filteredTokens = Object.values(allTokensOriginal).map(token => {
      if (token.category === "Chain") {
        return null
      }
      token.chains.forEach(chain => {
        chainsSet.add(chain)
      })
      if (selectedChain !== undefined) {
        if (token.chains.length === 1) {
          if (token.chains[0] !== selectedChain) {
            return null
          }
        } else {
          const chainTvl = token.chainTvls[selectedChain]
          if (chainTvl === undefined) {
            return null
          }
          return {
            ...token,
            tvl: chainTvl
          }
        }
      }
      return {
        ...token,
        mcaptvl: (token.tvl !== 0 && token.mcap) ? token.mcap / token.tvl : null,
        fdvtvl: (token.tvl !== 0 && token.fdv) ? token.fdv / token.tvl : null,
      }
    }).filter(token => token !== null)

    chainOptions.forEach(chain => chainsSet.delete(chain))
    const otherChains = Array.from(chainsSet)
    return [filteredTokens, otherChains]
  }, [allTokensOriginal, selectedChain])

  if (chain === undefined && (stakingEnabled || pool2Enabled)) {
    tokensList.forEach(token => {
      if (token.staking && stakingEnabled) {
        totalVolumeUSD += token.staking
      }
      if (token.pool2 && pool2Enabled) {
        totalVolumeUSD += token.pool2
      }
    })
  }

  const topToken = { name: 'Uniswap', tvl: 0 }
  if (tokensList.length > 0) {
    topToken.name = tokensList[0]?.name
    topToken.tvl = tokensList[0]?.tvl
  } else {
    return <Redirect to="/home" />
  }

  document.title = `DefiLlama - DeFi Dashboard`;

  const chart = selectedChain === undefined ? <GlobalChart display="liquidity" /> :
    chainChartData[selectedChain] !== undefined ? <ProtocolChart
      chartData={chainChartData[selectedChain]}
      protocol={selectedChain}
      denomination={denomination}
    /> : <Loader />;

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={transparentize(0.8, '#445ed0')} />
      <ContentWrapper>
        <div>
          <AutoColumn gap="24px" style={{ paddingBottom: below800 ? '0' : '24px' }}>
            <RowBetween>
              <TYPE.largeHeader>Defi Dashboard</TYPE.largeHeader>
              {!below800 && <RightSettings />}
            </RowBetween>
            <Search />
            {selectedChain === "Fantom" &&
              <Panel background={true} style={{ textAlign: 'center' }}>
                <TYPE.main fontWeight={400}>
                  Fantom just announced <a style={{ color: 'inherit', fontWeight: '700' }} href="https://fantom.foundation/blog/announcing-370m-ftm-incentive-program/">a 370m liquidity program that uses DefiLlama's data</a>
                </TYPE.main>
              </Panel>
            }
          </AutoColumn>
          {below800 && ( // mobile card
            <AutoColumn
              style={{
                height: '100%',
                width: '100%',
                marginRight: '10px',
                marginTop: '10px'
              }}
              gap="10px"
            >
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Total Value Locked(USD)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                      {formattedNum(totalVolumeUSD, true)}
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>Change (24h)</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                      {volumeChangeUSD?.toFixed(2)}%
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
              <Panel style={{ padding: '18px 25px' }}>
                <AutoColumn gap="4px">
                  <RowBetween>
                    <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
                  </RowBetween>
                  <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                    <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                      {((topToken.tvl / totalVolumeUSD) * 100.0).toFixed(2)}%
                    </TYPE.main>
                  </RowBetween>
                </AutoColumn>
              </Panel>
            </AutoColumn>
          )}
          {!below800 && (
            <AutoRow>
              <AutoColumn
                style={{
                  height: '100%',
                  width: '100%',
                  maxWidth: '350px',
                  marginRight: '10px'
                }}
                gap="10px"
              >
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Total Value Locked (USD)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#4f8fea'}>
                        {formattedNum(totalVolumeUSD, true)}
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>Change (24h)</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#fd3c99'}>
                        {volumeChangeUSD.toFixed(2)}%
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
                <Panel style={{ padding: '18px 25px' }}>
                  <AutoColumn gap="4px">
                    <RowBetween>
                      <TYPE.heading>{topToken.name} Dominance</TYPE.heading>
                    </RowBetween>
                    <RowBetween style={{ marginTop: '4px', marginBottom: '4px' }} align="flex-end">
                      <TYPE.main fontSize={'33px'} lineHeight={'39px'} fontWeight={600} color={'#46acb7'}>
                        {((topToken.tvl / totalVolumeUSD) * 100.0).toFixed(2)}%
                      </TYPE.main>
                    </RowBetween>
                  </AutoColumn>
                </Panel>
              </AutoColumn>
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                {chart}
              </Panel>
            </AutoRow>
          )}
          {below800 && (
            <AutoColumn style={{ marginTop: '6px' }} gap="24px">
              <Panel style={{ height: '100%', minHeight: '300px' }}>
                {chart}
              </Panel>
            </AutoColumn>
          )}
          <ListOptions gap="10px" style={{ marginTop: '2rem', marginBottom: '.5rem' }}>
            <RowBetween>
              <TYPE.main fontSize={'1.125rem'}>TVL Rankings</TYPE.main>
              <RowFlat>
                {below800 ?
                  <DropdownSelect options={chainOptions.slice(0, -1).concat(otherChains).reduce((acc, item) => ({
                    ...acc,
                    [item]: item
                  }), {})} active={selectedChain || 'All'} setActive={setSelectedChain} />
                  :
                  chainOptions.map((name, i) => {
                    if (name === "Others") {
                      return <DropdownSelect key={name} options={otherChains.reduce((acc, item) => ({
                        ...acc,
                        [item]: item
                      }), {})} active={(chainOptions.includes(selectedChain) || selectedChain === undefined) ? 'Other' : selectedChain} setActive={setSelectedChain} />
                    }
                    if (selectedChain === name || (name === 'All' && selectedChain === undefined)) {
                      return <ButtonDark style={{ margin: '0.2rem' }} key={name} >{name}</ButtonDark>
                    } else {
                      return <BasicLink to={name === "All" ? '/home' : `/chain/${name}`} key={name}>
                        <ButtonLight style={{ margin: '0.2rem' }}>{name}</ButtonLight>
                      </BasicLink>
                    }
                  })}
              </RowFlat>
              <CustomLink to={'/protocols'}>See All</CustomLink>
            </RowBetween>
          </ListOptions>
          <Panel style={{ marginTop: '6px', padding: '1.125rem 0 ' }}>
            <TopTokenList tokens={tokensList} itemMax={below800 ? 50 : 100} />
          </Panel>
        </div>
        <div style={{ margin: 'auto' }}>
          <a href="https://defillama-datasets.s3.eu-central-1.amazonaws.com/all.csv"><ButtonDark>Download all data in .csv</ButtonDark></a>
        </div>
      </ContentWrapper>
    </PageWrapper >
  )
}

export default withRouter(GlobalPage)
